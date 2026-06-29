# Copy tokenization plan (curated keepers)

Input spec for the full "every copy string is a named micro-copy token" migration
(prx-gwr8). Produced by `string-audit extract.mjs dist/index.html --emit`, then
curated: **77 keepers** (real copy) vs **71 incidental** (code-demo, diagram,
inline fragments). No page changes — this is the review artifact that precedes
the migration.

## Naming scheme

Auto-extract proposes ugly `surface.<el>.<slug>` keys. Replace with **semantic,
section-prefixed** keys (kebab), type inferred by string-audit (`headline` ≤65,
`cta` action-verb, `meta` ≤160, `claim` → grounding, else `body`):

| Section | Token keys |
| --- | --- |
| **meta** | `meta-title`, `meta-description`¹ |
| **nav / toc** | `nav-{conformance,writing,github}`, `toc-{bet,model,honesty,proof}`, `nav-skip` |
| **hero** | `hero-pitch`² (h1), `hero-lead` (p), `cta-read-bet`², `cta-guest-room`, panel captions `panel-{guest,door,room}` |
| **bet** | `bet-statement` (p), `bet-body-2`, `bet-body-3`, `bet-grade-label`, `bet-grade-note` |
| **model** | `section-model`² (h2), `model-lead`, `model-body-2`, `model-body-3`, `model-body-4` |
| **honesty** | `honesty-heading` (h2), `honesty-lead`, `honesty-instrument`, `honesty-body-*`, grade legend `grade-{enforced,partial,aspirational}-{label,note}` |
| **honesty claims** | `claim-docs`, `claim-specs`, `claim-provenance`, `claim-broker`, `claim-converge`, `claim-contracts` → **type `claim`** (grounding) |
| **proof** | `section-proof`² (h2), card titles `proof-{guest-room,prx,claude-box}-title`², card tags `proof-*-tag`, `proof-start-here`, `proof-clone-lead`, provenance copy |
| **colophon** | `byline`² (h2), `bio-1`, `bio-2`, `contact-cta`², `link-{rdd,github}` |

¹ `meta-description` / tagline are **CI-locked brand tokens** — defined in the
brand submodule, not rewritable here. Reference, don't redefine.
² Already tokens today (shipped #85/#86/#87) — these just get folded into the scheme.

## The inline-markup set (decide before migrating)

Several body paragraphs are **fragmented by inline `<strong>`/`<em>`/`<a>`** — the
extractor split them: `"An instrument built to catch my"` + `<em>own</em>` +
`"over-statements…"`; `"Built by"` + `<a>`; `"Backed by"` + links; `"Each"` +
link. A flat token **cannot** hold these without losing the markup.

**Recommendation:** do NOT flatten rich paragraphs into tokens. Keep them as
inline content; they already enter string-audit as `body` symbols via
`emit-catalog`. Tokenize only the **atomic** copy (headings, labels, CTAs, nav,
single-clause claim texts). "Every string a named token" applies cleanly to
micro-copy; rich prose stays templated content + audited as `body`.

## Excluded — incidental (71), by category

- **Code-demo `<pre>` spans** (~30): `execGit`, `"push"`, `"keeper"`, `pushed`,
  `refused`, `const`, `expandRoom`, `deniedDoors`, `"host=github.com"`, the `//`
  comments, `git`, `npm`. These are sample code, not copy.
- **Diagram / inline fragments** (~25): `door`, `room`, `guest`, `between`,
  `bounded.tools` (mark), `agent`, single-word `<em>`/`<strong>`.
- **Identifiers** (~16): commit hashes, `in-toto SLSA DSSE`, `Sigstore OIDC Rekor
  GHCR`, `@bounded-systems/*` — code/registry strings, not prose.

## Migration steps (prx-gwr8, focused session)

1. Land this naming scheme; add the **atomic** keepers as tokens in
   `content/strings.json` (type-correct keys → string-audit types them).
2. Assert each with a `@marketing` scenario in `content/marketing.feature`
   (drift-lock, the #85/#86 pattern).
3. Type the six `claim-*` symbols as `claim` and populate `grounding.json` from
   `data/conformance-evidence.json` / `integrity/claims` (this is prx-qhuv).
4. Leave rich-markup paragraphs as templated content (audited `body`).
5. Verify: `content.mjs --check`, `emit-catalog`, `audit-gate --strict`, build,
   structure, semantic, shacl.

Full extracted set: `string-audit extract.mjs dist/index.html --emit`.
