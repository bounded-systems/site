# structure-audit

A deterministic, **whole-page structure gate** — sibling to `string-audit` (copy)
and `lone` (per-page DOM bless). It validates the document *structure*, reader
survivability, and the internal link graph, and extracts a content-addressed
`structure.json` so the page skeleton is a pure function of source (drift fails
under `--check`).

```
node integrity/structure-audit/audit.mjs <distDir> [--check]
```

## Checks (errors fail)

1. **Reader survivability** (blog posts) — runs **Mozilla Readability** (the engine
   Firefox Reader uses) over each article; it must extract an article that still
   contains the `<h1>` and isn't mostly-empty. The free test of *"do the semantics
   survive the stylesheet being stripped"* — the generalisation of `check-reader`.
   Scoped to articles; list/error pages aren't reader targets.
2. **Outline** — exactly one `<h1>`, no skipped heading levels.
3. **Landmarks** — at most one `<main>`; a content page with none is a warning.
4. **Internal link-graph** — every internal href resolves to a served file, an
   in-page anchor, or a known **deploy-time sidecar** (`/rekor`, `/provenance.json`,
   `/site.sha256` — generated at deploy, so absent from a local build); dead links
   error, and a served page reachable from nothing is an **orphan** (warn).

## Deterministic

Same `dist/` → byte-identical `structure.json` (sorted, hashed). The baseline is
**committed** here, and CI runs `--check` to fail on drift, exactly like the copy
catalog. Regenerate after an intentional structure change:

```
npm run build && node integrity/structure-audit/audit.mjs dist   # rewrites structure.json
```

## Wired in

- **bounded.tools** — the `structure-audit` job in `.github/workflows/brand-checks.yml`
  builds the full site, installs this tool's deps, and runs `--check`.
- **robertdelanghe.dev** — pending: vendor this tenant hash-pinned (like
  `string-audit`) and run `--check` in bd-site's CI. (bd-site already has a DOM via
  `lone`/Deno; it can run the same `audit.mjs` under Node.)

## Next dimensions

- the **claims** check — validate `integrity/claims/` graphs (every claim graded,
  gap-disclosed, evidence-linked, secured) as the structure-audit "claims" dimension.
- **linked-data validity** — JSON-LD parses + required props per `@type`; mf2 parses.
- **semantics-not-styling** — generalise `check-reader` (styled-as-heading / list /
  button without the semantic tag).

Tenant of `integrity/`; subtree-split into its own repo with the rest later.
