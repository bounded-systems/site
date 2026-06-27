# integrity

Shared **build-provenance tooling** for the Bounded Systems sites: keyless,
whole-site signing (Sigstore → Rekor → GHCR) plus independent verification.

This is a **plain directory** in `bounded-systems/site` for now — not a submodule,
not a nested git repo. It is the `git subtree split` boundary: once the interface
settles it carves out into its own `bounded-systems/integrity` repo and publishes
as a package + reusable GitHub Action.

## Contents

| Path | What |
|---|---|
| `scripts/gen-sitemanifest.mjs` | Content-address the whole built site → `dist/site.sha256` (cwd-relative `dist`, `$DIST` override). |
| `scripts/gen-provenance.mjs` | Emit `dist/provenance.json` + the `/rekor` redirect sidecar. Superset of both sites (conditional `intotoStatement`; `$PROVENANCE_DOC_URL` for the caveat link). |
| `verify-site.mjs` | **Independent verifier/CLI** — `node integrity/verify-site.mjs <https://site \| ./dist>`. cosign-verifies the signed manifest against the builder's OIDC identity + Rekor, then re-hashes every served file. The honest, out-of-page counterpart to the badge. |
| `provenance.json` | sha256 hash-pin of the files here (mirrors `vendor/string-audit/provenance.json`), so a vendoring consumer can verify integrity. |
| `structure-audit/`, `policy/` | Stubs for the next tenants (semantic/reader audit; policy-controller/OIDC enforcement). |

## How the sites consume it

- **bounded-systems/site (this repo)**: `scripts/gen-sitemanifest.mjs` and
  `scripts/gen-provenance.mjs` are thin shims that `import` the canonical versions
  here, run from the repo root so `dist` resolves correctly. The deploy pipeline
  is unchanged.
- **bdelanghe/site (separate repo)**: will **vendor** this directory hash-pinned
  (same pattern as `vendor/string-audit/`) — no submodule — and point its shims at
  the vendored copy. (Tracked as the next step.)

## Next

- A composite GitHub Action (`action.yml`) wrapping the shared deploy STEPS
  (sign manifest → gen-provenance → tar + `oras push` + `cosign sign`; and a
  `promote` sibling: `cosign verify` + `oras pull` + extract). Composite (not a
  reusable workflow) because the two sites' build jobs differ in shape. Wired +
  tested during the deploy migration so prod stays fail-closed.
- Publish to npm **with Sigstore provenance**, SRI-pinnable, so a browser
  extension / CI policy can consume `verify-site` directly.
