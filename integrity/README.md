# integrity

Site-specific **integrity inputs** for bounded.tools. The shared build-provenance
**tooling** that used to live here (whole-site signing, provenance, verification,
structure audit) was extracted into the standalone
[`bounded-systems/conformance-kit`](https://github.com/bounded-systems/conformance-kit)
and is now consumed as a single hash-pinned, vendored copy under
[`vendor/conformance-kit/`](../vendor/conformance-kit/) — so there is exactly **one
copy** of each tool, not a per-site duplicate.

## Where the tooling went

| Was (`integrity/…`) | Now (`vendor/conformance-kit/…`) |
|---|---|
| `scripts/gen-sitemanifest.mjs` | `integrity/gen-sitemanifest.mjs` (via `scripts/gen-sitemanifest.mjs` shim) |
| `scripts/gen-provenance.mjs` | `integrity/gen-provenance.mjs` (via `scripts/gen-provenance.mjs` shim) |
| `verify-site.mjs` | `integrity/verify-site.mjs` |
| `verify/verify.mjs` | `integrity/verify/verify.mjs` (deploy verifies prod with this) |
| `structure-audit/audit.mjs` | `integrity/structure-audit/audit.mjs` |
| `provenance.json` (hash-pin) | `../vendor/conformance-kit.lock.json` (verified by `scripts/verify-vendor.mjs`) |

The vendored copy is integrity-checked before every use (`node
scripts/verify-vendor.mjs`); re-vendor by copying the kit at a new pinned commit
and regenerating the lock.

## What stays here (site-owned inputs, not tooling)

| Path | What |
|---|---|
| `structure-audit/structure.json` | The content-addressed **structure baseline** for the kit's structure-audit (`$STRUCTURE_BASELINE`). The baseline belongs to the consumer, never the vendored kit, so a re-vendor can't mutate it. |
| `claims/` | Nanopublication **claim graphs** + `validate-claims.mjs` (a bounded.tools-specific gate: every claim graded, gaps disclosed, evidence linked). |
| `policy/` | The cosign / policy-controller **admission policy** + verify recipes for the signed OCI artifact. |
| `verifier-decision.md` | The decision record for the out-of-page verifier. |

The SHACL structured-data contract for the site lives in
[`../contract/jsonld.shapes.ttl`](../contract/jsonld.shapes.ttl) and is run by the
kit's `gates/shacl-runner.mjs`.
