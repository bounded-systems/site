<!-- Contract lattice — Bounded Systems
     /contracts — projected from the built page by scripts/gen-markdown.mjs.
     Do not edit: change the page (or its generator) and rebuild. -->

[← bounded.tools](/)

# Contract lattice

Every contract between our repos, graded by its own check. Rendered at **build time** from the **signed** [trellis](https://github.com/bounded-systems/trellis) status projection — the same one the [Trust Center](https://github.com/bounded-systems/trust/blob/main/CLAIMS.md) reads. Nothing here is hand-typed: a Gap is real drift, shown honestly, until the check goes green. The data is refreshed by a signed, verified sync — see below.

**74** — repos

**7** — checked

**6** — passing

**1** — gaps

**35** — declared

| Contract | Kind | Grade | Governs |
| --- | --- | --- | --- |
| `concierge-wire` | wire | Enforced | concierged's capability-resolution RPC surface (register/resolve/keys/list/status). |
| `descriptor-honesty` | provenance | Enforced | A repo upholding its OWN descriptor claim — every trellis.json proof claim's provenBy file exists and its git blob hash matches the pin in the generated README. A UNARY contract, verified by @bounded-systems/drift-gate's pure descriptor check (offline; the surface check needs npm and stays in per-repo CI). Wired for guest-room; other descriptor repos next. |
| `door-kit-mirror` | vendored-pin | Enforced | The door-kit client + runtime vendored into each door daemon — must stay byte-identical to door-kit HEAD. |
| `keeper-wire` | wire | Enforced | keeperd's git-signing RPC surface (commit/push/import-and-push/attest-launch/sign/verify/status/getPublicKey). |
| `sanctioned-reader-seam` | import-boundary | Enforced | A 'one sanctioned reader' package upholding its own seam claim (allowed imports + no ambient authority) — a UNARY contract. Wired for fs; env/host/proc/repo-root next. |
| `scout-wire` | wire | Enforced | scoutd's external-read RPC surface (repo/pr/issue/fetch/download/status). |
| `trellis-kit-lattice` | vendored-pin | Gap | The kit's findCycles/findMultiContractPairs vendored into trellis's check/lattice.ts — it runs \`--no-remote\` in a sealed derivation and cannot import the kit, so it mirrors it. Must stay equal to trellis-kit HEAD; verified by check/lattice\_test.ts (drift fails CI). This is the declared cross-repo clone the overlap check (check/overlap.ts) sanctions in place of an allowlist. |
| `ast-git-spec` | shared-schema | Declared | AST-based git clean/smudge diff+merge spec (design stage). |
| `brand-check` | repo-config | Declared | gh-action-brand-checks — CI gate for brand-token compliance; run by fleet. |
| `brand-tokens` | shared-schema | Declared | brand's W3C design tokens + self-hosted fonts — consumed by the sites, gated by gh-action-brand-checks. |
| `component-a11y-spec` | shared-schema | Declared | lone's semantic/a11y blessing for DOM subtrees — the component spec baobab points at. |
| `conformance-standard` | repo-config | Declared | The org/repo conformance standard (rules + gates) repos are measured against. |
| `content-token-catalog` | repo-config | Declared | The org-wide content-token catalog aggregated from opted-in repos' content/strings.json. |
| `contract-lattice-projection` | provenance | Declared | trellis's cosign-signed status.json (the lattice projection) — consumed by the Trust Center + the bounded.tools /contracts page. |
| `contracts-check` | repo-config | Declared | gh-action-contracts — CI gate for contract conformance; run by fleet. |
| `design-system-structure` | shared-schema | Declared | baobab's configurable design-system structure — the shape brand pins (no defaults). |
| `deterministic-release` | repo-config | Declared | mint — deterministic, signed releases from .release/ intent files (bumps deno.json/jsr.json/package.json). Adopted by dev-contracts. |
| `dev-contract-schema` | shared-schema | Declared | The DevContracts Zod schemas (dev\_contract/lock/token) for declarative project-config contracts — consolidated into @bounded-systems/dev-contracts. |
| `dns-as-code` | external-platform | Declared | bounded.tools DNS-as-code — reviewer-gated Cloudflare zone records, now schema-defined (deploy/dns-schema.mjs validates every state/\*.dns.json). |
| `front-desk-projects` | external-platform | Declared | gh-project-room ↔ GitHub Projects v2 GraphQL (fields/views/workflows). |
| `guest-room-protocol` | vendored-pin | Declared | The guest-room room+door wire protocol vendored into door-kit and each daemon. |
| `jsr-library` | shared-schema | Declared | An extracted @bounded-systems/\* library's published JSR surface — the typed contract prx consumes. |
| `lima-devshell-config` | repo-config | Declared | Bootstrap devshell for Lima VMs + macOS home-manager (Nix flake). |
| `linked-data-structure` | shared-schema | Declared | JSON-LD / schema.org linked-data structure over an Obsidian vault. |
| `mcp-tool-surface` | wire | Declared | static-mcp's Sigstore-verified static-response MCP surface — the base site-mcp/bounded-tools-mcp implement. |
| `net-egress` | wire | Declared | netd's allowlist-egress surface — a CONNECT proxy, not a JSON-RPC verb (Proxy-Authorization grant). |
| `nix-facilities` | repo-config | Declared | Shared Nix flakes, devshells, and build substrate for the org. |
| `node-uniqueness-check` | repo-config | Declared | gh-action-node-uniqueness — CI gate asserting node/dep uniqueness; run by fleet. |
| `ocap-provenance-predicate` | shared-schema | Declared | The in-toto SLSA predicate claude-box (producer) and keeperd (signer) both pin byte-for-byte. |
| `oci-dev-registry` | external-platform | Declared | Local-first OCI registry + devcontainer build system with build traceability. |
| `oidc-app-token-broker` | external-platform | Declared | cf-oidc-token-broker mints GitHub App installation tokens over Actions OIDC (the App key lives only in the broker) — consumed by gh-project-room's front-desk-sync. |
| `org-defaults` | repo-config | Declared | Org-level defaults + the public profile README every bounded-systems repo inherits. |
| `org-quality-standard` | repo-config | Declared | The reusable repo-standard workflow .github provides (security + the prose-proxy quality gates + test) — every repo that calls it runs the same org quality bar. CI-enforced via GitHub Actions; declared here (no trellis flake check yet). |
| `peercred-helper` | shared-schema | Declared | SO\_PEERCRED helper for launcherd (Rust) — peer-identity extraction on unix sockets. |
| `roundtrip-validation` | shared-schema | Declared | Parse-to-AST + regenerate-source fidelity validation (Deno + SWC). |
| `schema-transform` | shared-schema | Declared | Schema transformation/bridging between formats. |
| `seam-check-lib` | import-boundary | Declared | seam-check's published seam-assertion library — repos devDep it to enforce their own import boundary in tests (door-kit, fs). |
| `signed-static-api` | provenance | Declared | A site's signed, content-addressed static API — produced by the sites, verified by verify / the MCP servers. |
| `token-audit-toolkit` | shared-schema | Declared | Claude Code token-usage auditor + home-manager module. |
| `vault-content` | repo-config | Declared | Offline Obsidian vault whose drafts become robertdelanghe.dev posts. |
| `verbspec-lib` | shared-schema | Declared | verbspec (defineVerb/dispatch + one Zod I/O per verb, projected to CLI/MCP/OpenAPI) — the framework the wire agreements, installer, string-audit et al. import. |
| `wasm-hook-builder` | repo-config | Declared | Build Rust binaries into Lefthook hooks as WASM components. |

## Verify it yourself

The projection is cosign keyless-signed by trellis CI, and re-verified (not just displayed) by `lattice-refresh.yml` every time this page's data refreshes. Don't take our word for it — check the source:

```
curl -sO https://raw.githubusercontent.com/bounded-systems/trellis/status/status.json
curl -sO https://raw.githubusercontent.com/bounded-systems/trellis/status/status.json.sigstore.json
cosign verify-blob --bundle status.json.sigstore.json \
  --certificate-identity-regexp '^https://github.com/bounded-systems/trellis/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com status.json
```
