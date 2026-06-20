#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# desopoll — deployment script (single source of truth)
# =============================================================================
# The desopoll APP is always deployed with the HELM CHART in deploy/helm/desopoll.
# A few SHARED, out-of-namespace prerequisites cannot live in the chart and are
# handled here as explicit, idempotent steps.
#
# ARCHITECTURE / WHY (captured so we don't rediscover it):
#  - Target: RKE2 K8s cluster `bdsp-labplatform` (kubeconfig below). 3 CP nodes 172.28.0.21-23.
#  - Routing: ONE Cilium Gateway `labplatform` (ns desolabs-labplatform, IP 172.28.0.24).
#    The public edge (95.131.206.10) forwards ALL hostnames to that gateway only, so a
#    dedicated gateway with a different IP would never receive traffic. We therefore
#    ATTACH poll.deso.tech to the shared gateway: two appended listeners (http-poll,
#    https-poll) that allow HTTPRoutes from the `desopoll` namespace.
#  - TLS: cert-manager, ClusterIssuer-style ACME but we use NAMESPACED Issuers in our
#    chart (HTTP-01, solver = gatewayHTTPRoute on the shared gateway). prod issuer.
#  - DNS split-horizon (CRITICAL): cert-manager's HTTP-01 self-check runs in-cluster and
#    cannot reach the public edge IP (no hairpin NAT) -> challenge hangs. The cluster
#    resolves platform hostnames to the INTERNAL gateway IP via the `hosts` plugin in the
#    CoreDNS Corefile ConfigMap `rke2-coredns-rke2-coredns` (kube-system). NOTE: the
#    `coredns-custom` ConfigMap is NOT imported here and has NO effect.
#  - Database: dedicated `desopoll` DB on the shared CNPG Postgres (no new cluster). CNPG
#    superuser is disabled, so the DB+role must be provisioned with a privileged
#    credential; the connection string is injected as Secret `desopoll-db`.
#  - Redis: our own instance in the desopoll namespace (chart) — volatile game state + pub/sub.
#  - Images: built by GitHub Actions and pushed to r.deso.tech/desopoll/*.
#
# PERIMETER: steps marked [SHARED] touch resources outside the desopoll namespace
# (gateway in desolabs-labplatform, CoreDNS in kube-system). They require explicit
# authorization from the platform owner and are applied additively/idempotently.
# =============================================================================

# ---- Config (override via environment) --------------------------------------
KUBECONFIG_FILE="${KUBECONFIG_FILE:-$HOME/.kube/bdsp-labplatform.yaml}"
NAMESPACE="${NAMESPACE:-desopoll}"
RELEASE="${RELEASE:-desopoll}"
HOST_FQDN="${HOST_FQDN:-poll.deso.tech}"
GATEWAY_INTERNAL_IP="${GATEWAY_INTERNAL_IP:-172.28.0.24}"
SHARED_GATEWAY_NS="${SHARED_GATEWAY_NS:-desolabs-labplatform}"
SHARED_GATEWAY="${SHARED_GATEWAY:-labplatform}"
COREDNS_CM="${COREDNS_CM:-rke2-coredns-rke2-coredns}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHART_DIR="$HERE/helm/desopoll"
CLUSTER_DIR="$HERE/cluster"

kc() { kubectl --kubeconfig "$KUBECONFIG_FILE" "$@"; }
hh() { helm --kubeconfig "$KUBECONFIG_FILE" "$@"; }
log() { printf '\n\033[1;36m== %s ==\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }

# ---- Steps ------------------------------------------------------------------

ensure_namespace() {
  log "Namespace $NAMESPACE"
  kc get ns "$NAMESPACE" >/dev/null 2>&1 && echo "exists" || kc create namespace "$NAMESPACE"
}

# [SHARED] Append a listener for our hostname to the shared gateway (idempotent).
add_gateway_listener() {
  local name="$1" file="$2"
  if kc -n "$SHARED_GATEWAY_NS" get gateway "$SHARED_GATEWAY" \
        -o jsonpath="{.spec.listeners[?(@.name=='$name')].name}" 2>/dev/null | grep -q "$name"; then
    echo "listener $name already present"
  else
    warn "[SHARED] adding listener $name to gateway $SHARED_GATEWAY_NS/$SHARED_GATEWAY"
    kc -n "$SHARED_GATEWAY_NS" patch gateway "$SHARED_GATEWAY" --type=json --patch-file "$file"
  fi
}

# [SHARED] Add poll.deso.tech -> internal gateway IP to the CoreDNS hosts block (idempotent).
add_coredns_host() {
  log "[SHARED] CoreDNS split-horizon for $HOST_FQDN"
  local cur
  cur=$(kc -n kube-system get cm "$COREDNS_CM" -o jsonpath='{.data.Corefile}')
  if printf '%s' "$cur" | grep -q "$GATEWAY_INTERNAL_IP $HOST_FQDN"; then
    echo "hosts entry already present"
    return
  fi
  warn "[SHARED] inserting '$GATEWAY_INTERNAL_IP $HOST_FQDN' into $COREDNS_CM hosts block"
  local new
  new=$(printf '%s\n' "$cur" | awk -v ip="$GATEWAY_INTERNAL_IP" -v host="$HOST_FQDN" '
    /hosts[[:space:]]*{/ { inhosts=1 }
    inhosts && /fallthrough/ && !ins { print "            " ip " " host; ins=1 }
    { print }
    inhosts && /}/ { inhosts=0 }
  ')
  { echo "data:"; echo "  Corefile: |"; printf '%s\n' "$new" | sed 's/^/    /'; } > /tmp/desopoll-coredns-patch.yaml
  kc -n kube-system patch cm "$COREDNS_CM" --type=merge --patch-file /tmp/desopoll-coredns-patch.yaml
  echo "CoreDNS reloads automatically (~1 min)."
}

prereqs() {
  warn "These steps modify SHARED cluster resources (gateway + CoreDNS) outside the desopoll namespace."
  ensure_namespace
  add_gateway_listener "http-poll"  "$CLUSTER_DIR/gateway-http-listener-poll.json"
  add_gateway_listener "https-poll" "$CLUSTER_DIR/gateway-https-listener-poll.json"
  add_coredns_host
}

# Secret with the dedicated Postgres connection string (DB provisioned separately).
create_db_secret() {
  log "Secret desopoll-db (DATABASE_URL)"
  : "${DESOPOLL_DATABASE_URL:?Set DESOPOLL_DATABASE_URL=postgres://desopoll_app:PASS@desolabs-db-rw.desolabs-labplatform.svc:5432/desopoll}"
  kc -n "$NAMESPACE" create secret generic desopoll-db \
    --from-literal=DATABASE_URL="$DESOPOLL_DATABASE_URL" \
    --dry-run=client -o yaml | kc apply -f -
}

# Deploy / upgrade the APP via Helm chart. Extra args are passed to helm.
deploy_app() {
  log "Helm upgrade --install $RELEASE"
  hh upgrade --install "$RELEASE" "$CHART_DIR" -n "$NAMESPACE" "$@"
}

verify() {
  log "Verify"
  kc -n "$NAMESPACE" get certificate,httproute,deploy,svc 2>/dev/null || true
  curl -sS -m 15 -o /dev/null -w "https://$HOST_FQDN -> code=%{http_code} ssl_verify=%{ssl_verify_result}\n" \
    "https://$HOST_FQDN/" || warn "external HTTPS check failed (DNS/edge/cert?)"
}

usage() {
  cat <<EOF
desopoll deploy — usage: ./deploy/deploy.sh <command>

  prereqs    [SHARED] one-time: gateway listeners + CoreDNS hosts entry (needs platform-owner OK)
  db-secret  create/update Secret desopoll-db from \$DESOPOLL_DATABASE_URL
  app        helm upgrade --install the chart (extra args forwarded to helm)
  verify     show resources + external HTTPS check
  all        prereqs -> db-secret (if \$DESOPOLL_DATABASE_URL set) -> app -> verify

Env overrides: KUBECONFIG_FILE NAMESPACE RELEASE HOST_FQDN GATEWAY_INTERNAL_IP
               SHARED_GATEWAY_NS SHARED_GATEWAY COREDNS_CM DESOPOLL_DATABASE_URL
EOF
}

case "${1:-}" in
  prereqs)   prereqs ;;
  db-secret) create_db_secret ;;
  app)       shift; deploy_app "$@" ;;
  verify)    verify ;;
  all)
    prereqs
    [ -n "${DESOPOLL_DATABASE_URL:-}" ] && create_db_secret || warn "skipping db-secret (DESOPOLL_DATABASE_URL not set)"
    deploy_app
    verify
    ;;
  *) usage ;;
esac
