# Handoff: seed `bounded.tagline` into prx seam packages

**Status:** open · **Target repo:** `bounded-systems/prx` · **Depends on:** site PR #3 (merged)

## Goal

Make `prx` the source of truth for the homepage capability-seam taglines. The
`bounded.tools` site already reads `bounded.tagline` from each seam package's
`package.json` via its daily `--from-prx` job (`scripts/gen-seams.mjs`); today
those fields don't exist, so the site falls back to the local seed
(`data/seams.json`). Adding them completes the cutover — automatically, per
package, with no further code change in this repo.

## Change

For each of the 6 seam packages below, add a top-level `"bounded": { "tagline": "…" }`
key to its `package.json`. Do **not** touch the npm `description` or `keywords`
(the site selects seams by `keywords` including `"seam"`, and reads display copy
from `bounded.tagline`).

| package.json path             | add                                                  |
| ----------------------------- | ---------------------------------------------------- |
| `packages/fs/package.json`    | `"bounded": { "tagline": "the one filesystem door" }` |
| `packages/proc/package.json`  | `"bounded": { "tagline": "the one subprocess spawn" }` |
| `packages/env/package.json`   | `"bounded": { "tagline": "the one reader of process.env" }` |
| `packages/gh/package.json`    | `"bounded": { "tagline": "GitHub CLI, policy-gated" }` |
| `packages/git/package.json`   | `"bounded": { "tagline": "git CLI, lock-recovering" }` |
| `packages/cas/package.json`   | `"bounded": { "tagline": "bytes addressed by digest" }` |

These match the site's current copy exactly, so the cutover is a **visual no-op**
— it only moves the source of truth. Changing a tagline here later updates the
live grid on the next sync; that is the intended mechanism.

## ⚠️ Confirm before editing

Verify `packages/*/package.json` are **authored** in `prx`, not synced/vendored
from the standalone per-package repos (e.g. `bounded-systems/fs`). The
`packages/fs/package.json` `repository.url` points at `github.com/bounded-systems/fs.git`,
which suggests they may be mirrored. If so, add `bounded.tagline` at the
**authoring source** and let it propagate to `prx/packages/*`; otherwise the next
sync will overwrite it.

## Branch / PR

- Branch: e.g. `seed-seam-taglines`
- Open a **draft PR**
- Title: `Add bounded.tagline to seam packages (site source-of-truth cutover)`

## Acceptance / verify

After merge to `prx` `main`, run from the **site** repo (it reads prx live):

```bash
node scripts/gen-seams.mjs --from-prx
# expect: "✓ refreshed from bounded-systems/prx: 6/6 sourced upstream, 0 changed"
```

`6/6 sourced upstream` (instead of the current `0/6` "no bounded.tagline upstream
yet") confirms the cutover. The site's daily `sync-seams` job then keeps the grid
tracking prx, and CI stays green (grid renders byte-identical).

## Context (site side, all merged)

- `scripts/gen-seams.mjs` — generator; `--from-prx` refreshes the seed from prx.
- `data/seams.json` — the seed/cache that `--from-prx` overwrites.
- `.github/workflows/sync-seams.yml` — daily refresh-from-prx + reconcile, opens a PR on drift; `--check` is the PR drift gate.
- Pattern modeled on [`bdelanghe/synoptic-github`](https://github.com/bdelanghe/synoptic-github).
