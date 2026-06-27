# verify — the standalone, out-of-page verifier

The "real" verifier from [`../verifier-decision.md`](../verifier-decision.md): hand
it a URL, and it proves — from *outside* the page, with no trust in anything the
page computes — that the served site is exactly what an allowed identity built and
logged.

```
node integrity/verify/verify.mjs https://bounded.tools
node integrity/verify/verify.mjs ./dist
```

## What it checks

1. **Cryptographic bundle verification, in-process and offline** (`sigstore-js`):
   the published Sigstore bundle (`site.sha256.sigstore.json`) over the whole-site
   manifest — signature, certificate chain to the **Fulcio** root, and the **Rekor
   inclusion proof** carried *in the bundle*. The OIDC issuer is enforced by
   sigstore-js; the certificate SAN is regex-matched against the builder identity
   (`^https://github.com/<repo>/`), cosign-style.
2. **Byte-for-byte integrity** of every file the manifest lists, fetched live (or
   read from a local `dist/`). It tolerates *known, named* CDN edge transforms
   (Cloudflare's JS-detection beacon on HTML, the Managed-Content block on
   `robots.txt`): if stripping a named transform restores the signed hash, the body
   is intact; anything else is a real mismatch.

Exit 0 iff the bundle verifies, the identity matches, and every file checks out.

## Why this, and not `verify-site.mjs`

Both are out-of-page verifiers; they trade differently:

| | `verify-site.mjs` | `verify/` (this) |
|---|---|---|
| deps | **zero** (vendored everywhere) | `sigstore` (npm) |
| signature check | shells out to `cosign`; **SKIPS** if absent | **in-process**, always |
| trust root | cosign's | bundled Fulcio/Rekor root (no network) |
| best for | quick check on any box | the authoritative check; npm-publish, SRI-pin, browser extension, CI policy |

## Why a bundle, not a Rekor query

Rekor **v2 removed** get-by-index / get-by-leaf-hash, and the v1 search API is in
maintenance — so a "look it up in Rekor" verifier is built on sand. The bundle we
publish carries its **own inclusion proof**, so verification is fully offline and
survives the v2 transition. That also makes this core SRI-pinnable and
npm-publishable (with its own Sigstore provenance) — the same logic a browser
extension or a CI admission gate would embed.

## What it proves — and doesn't

**Who** built it (identity) and **that it's intact + logged** (signature + Rekor
inclusion) — authentication and integrity. It does **not** prove the build was
*authorized* or *safe*; trusting identity X is the operator's judgment. Identity and
integrity, not legitimacy.
