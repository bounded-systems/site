# policy — enforcement

The layer that turns *"we publish signatures"* into *"only artifacts signed by an
allowed identity are accepted."* Detection and enforcement are two halves of
Sigstore's model; both are here:

- **Detection — live.** `.github/workflows/rekor-monitor.yml` watches the public
  Rekor log hourly for our two GitHub Actions identities and files an issue if a
  cert is minted for us that we didn't expect (`sigstore/rekor-monitor`). Sigstore's
  security model says this is *our* responsibility — "if no third parties monitor
  the logs, then any misbehaviour might go undetected."
- **Enforcement — here.** Refuse anything not keyless-signed by an allowed identity,
  at three layers: the deploy (already fail-closes), cluster admission, and local dev.

## What's in this directory

| File | Layer | What it enforces |
|---|---|---|
| `clusterimagepolicy.yaml` | cluster admission | `policy-controller` refuses to admit a site OCI artifact unless it was keyless-signed by our GitHub Actions identity, logged in Rekor. Fail-closed. |
| `verify-artifact.sh` | CI / local / human | The same `cosign verify` identity gate the deploy runs, factored out so everyone runs the identical check. |
| `pre-push.sample` | local dev | Git hook: don't push a locally-signed `dist/` that no longer verifies. Soft-skips when there's no signed build. |

The allowed identities, everywhere, are the two deploy workflows:
`^https://github.com/bounded-systems/site/…` and `^https://github.com/bdelanghe/site/…`,
issuer `https://token.actions.githubusercontent.com`.

## Verify an artifact (CI / local)

```sh
# inside the deploy devShell (pins cosign), or with cosign installed
integrity/policy/verify-artifact.sh ghcr.io/bounded-systems/bounded-tools-site:latest
# pin to a single site:
IDENTITY_RE='^https://github\.com/bdelanghe/site/' \
  integrity/policy/verify-artifact.sh ghcr.io/bdelanghe/robertdelanghe-dev:latest
```

This is intentionally the same check as the deploy's promote step — one gate, three
call sites — so "verified in CI" and "verified on my laptop" mean the identical thing.

## Cluster admission (policy-controller)

Try the policy against a local cluster before relying on it:

```sh
kind create cluster
helm install policy-controller sigstore/policy-controller -n cosign-system --create-namespace
kubectl apply -f integrity/policy/clusterimagepolicy.yaml

# a Pod using our signed artifact is admitted; an unsigned/other-identity image is denied.
```

`mode: enforce` denies on any failure to evaluate (Fulcio/Rekor unreachable included),
matching the deploy's fail-closed posture.

## Local-dev hook

```sh
cp integrity/policy/pre-push.sample .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

Because provenance is produced at deploy time (the OIDC identity only exists in CI),
this hook guards against pushing an already-locally-signed build that no longer
verifies — it is not a replacement for the deploy gate or the admission policy.

## What this does and does not prove

Enforcement checks **who** signed (identity) and **that it's logged** (Rekor
inclusion) — authentication and integrity. It does **not** prove the build was
*authorized* or *safe*; a policy that accepts identity X trusts X's judgment. That's
the authentication-vs-authorization seam: this layer is the authentication half,
mechanically enforced. References: `sigstore/policy-controller`, the OpenID Connect
spec, `docs.sigstore.dev/about/security`.
