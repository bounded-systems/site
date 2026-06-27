# structure-audit (stub)

Future tenant: a deterministic, whole-page **semantic / reader-structure** gate —
sibling to `string-audit` (copy) and `lone` (per-page DOM bless), not a rewrite.

Planned checks (content-addressed `structure.json` + `--check` drift, like the
copy catalog):

- **Reader survivability** — run `@mozilla/readability` over each built page;
  assert it extracts an article that still contains the `<h1>` + main prose.
- **Landmark coverage** — one `<main>`, content inside landmarks.
- **Internal link-graph** — every internal href/anchor resolves; no orphans;
  canonical + `rel` pairs self-consistent.
- **Linked-data validity** — JSON-LD parses + required props per `@type`; mf2
  parses; `@id` graph resolves.
- **Semantics-not-styling** — generalize `check-reader.mjs` (styled-as-heading /
  list / button without the semantic tag).

Needs a real DOM (`linkedom`), so it favors the Deno/`lone` path over the
zero-dep Node build. First home: bdelanghe/site (already has lone + microformats).
