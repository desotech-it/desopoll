# SSO (OIDC via Authentik @ auth.deso.tech)

Hosts/admins sign in with SSO; players stay anonymous (PIN + nickname). Local
email+password login remains available alongside SSO.

## 1. Register the OIDC application in Authentik

In the Authentik admin (auth.deso.tech):

1. **Providers → Create → OAuth2/OpenID Provider**
   - Name: `desopoll`
   - Authorization flow: your default (e.g. implicit/explicit consent)
   - Client type: **Confidential**
   - Redirect URIs (strict): `https://poll.deso.tech/api/auth/callback`
   - Scopes: `openid`, `email`, `profile` (Authentik's default `profile` scope already
     emits the `groups` claim with the user's group names)
2. **Applications → Create**
   - Name: `desopoll`, Slug: **`desopoll`** (this fixes the issuer URL)
   - Provider: the one above
   - Bind the groups/policies allowed to use the app
3. Note the **Client ID** and **Client Secret**.

Resulting issuer (already the chart default): `https://auth.deso.tech/application/o/desopoll/`
(discovery at `.../.well-known/openid-configuration`).

## 2. Decide the admin group

Pick the Authentik **group name** whose members should be desopoll **admins**
(e.g. `desopoll-admins`). Everyone else who logs in becomes a regular `user`
(just-in-time provisioned by email on first login).

## 3. Create the credentials Secret in the cluster

```sh
kubectl -n desopoll create secret generic desopoll-oidc \
  --from-literal=client_id=<CLIENT_ID> \
  --from-literal=client_secret=<CLIENT_SECRET>
```

## 4. Enable SSO and deploy

Set in `deploy/helm/desopoll/values.yaml` (or via `--set`):

```yaml
oidc:
  enabled: true
  adminGroup: "desopoll-admins"   # the group chosen above
```

Then:

```sh
./deploy/deploy.sh app
```

The backend reads `client_id`/`client_secret` from the `desopoll-oidc` Secret, the session
signing key from the auto-generated `desopoll-session` Secret, and exposes:
`/api/auth/login` (SSO), `/api/auth/callback`, `/api/auth/login/local`, `/api/auth/logout`,
`/api/auth/me`, `/api/auth/config`.

> If `oidc.enabled` is false (default) the app runs with local login only and the SSO
> button is hidden; flip it on once the steps above are done.
