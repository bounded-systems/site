# policy (stub)

Future tenant: **enforcement** of the provenance, for CI and local dev — the layer
that turns "we publish signatures" into "only artifacts signed by an allowed
identity are accepted."

**Monitoring — live.** `.github/workflows/rekor-monitor.yml` watches the public
Rekor log hourly for our two GitHub Actions identities and files an issue if a
cert is minted for us that we didn't expect (`sigstore/rekor-monitor`). This is
the half Sigstore's security model says is *our* responsibility — "if no third
parties monitor the logs, then any misbehaviour might go undetected."

**Enforcement — planned:**

- A `sigstore/policy-controller` ClusterImagePolicy (or `cosign` policy) pinning
  the allowed **OIDC identities** (`^https://github.com/bounded-systems/site/`,
  `^https://github.com/bdelanghe/site/`) and the issuer
  `https://token.actions.githubusercontent.com`.
- A **local-dev** verify/enforce hook so the policy can be checked before deploy,
  not just observed after — e.g. `verify-site` in a pre-push gate, or a kind
  cluster running policy-controller.

References: `sigstore/policy-controller`, the OpenID Connect spec.
