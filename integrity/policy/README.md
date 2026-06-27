# policy (stub)

Future tenant: **enforcement** of the provenance, for CI and local dev — the layer
that turns "we publish signatures" into "only artifacts signed by an allowed
identity are accepted."

Planned:

- A `sigstore/policy-controller` ClusterImagePolicy (or `cosign` policy) pinning
  the allowed **OIDC identities** (`^https://github.com/bounded-systems/site/`,
  `^https://github.com/bdelanghe/site/`) and the issuer
  `https://token.actions.githubusercontent.com`.
- A **local-dev** verify/enforce hook so the policy can be checked before deploy,
  not just observed after — e.g. `verify-site` in a pre-push gate, or a kind
  cluster running policy-controller.

References: `sigstore/policy-controller`, the OpenID Connect spec.
