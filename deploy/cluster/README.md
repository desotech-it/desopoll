# Cluster prerequisites (outside the desopoll namespace)

desopoll runs in the `desopoll` namespace, but a few one-time changes are required on
**shared cluster resources** owned by the platform team. They are documented here so they
can be reviewed, reproduced, and eventually folded into the owning charts for persistence.

## 1. Shared Gateway listeners (labplatform Gateway)

The public edge routes **all** hostnames to the single Cilium Gateway `labplatform`
(namespace `desolabs-labplatform`, internal IP `172.28.0.24`). To serve `poll.deso.tech`
from the **same** gateway/IP, two listeners are appended (existing listeners untouched);
each allows HTTPRoutes from the `desopoll` namespace:

```sh
kubectl patch gateway labplatform -n desolabs-labplatform --type=json \
  --patch-file deploy/cluster/gateway-http-listener-poll.json
kubectl patch gateway labplatform -n desolabs-labplatform --type=json \
  --patch-file deploy/cluster/gateway-https-listener-poll.json
```

The HTTPS listener references the TLS secret `poll-deso-tech-tls` in the `desopoll`
namespace (cross-namespace), permitted by the `ReferenceGrant` shipped in the Helm chart.

> The labplatform Gateway is Helm-managed; for persistence add these listeners to the
> labplatform chart values (it already supports extra hostnames: `http-extra-*`).

## 2. Internal DNS (split-horizon)

cert-manager's HTTP-01 self-check runs in-cluster and cannot reach the public edge IP
(no hairpin NAT), so the cluster must resolve `poll.deso.tech` to the **internal** gateway
IP. This is done by the `hosts` plugin in the CoreDNS Corefile
(ConfigMap `rke2-coredns-rke2-coredns`, namespace `kube-system`). Add this line to the
`hosts { ... }` block:

```
172.28.0.24 poll.deso.tech
```

CoreDNS reloads automatically (`reload` plugin). Public DNS is unaffected.

> Note: the `coredns-custom` ConfigMap is **not** imported by this cluster's CoreDNS and has
> no effect. For persistence, add `poll.deso.tech` via the `rke2-coredns` HelmChartConfig.
