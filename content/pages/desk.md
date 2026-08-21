<!-- Desk — Bounded Systems
     /desk — projected from the built page by scripts/gen-markdown.mjs.
     Do not edit: change the page (or its generator) and rebuild. -->

[← bounded.tools](/)

# Desk

What is worth picking up next, ranked by the board itself. This is the same projection a session reads before it claims work — not a second opinion about it. Anything already claimed, finished, or waiting on a check is held back, and the counts below say how much.

This queue schedules autonomous agent sessions. It is not a product roadmap, and the backlog count is not a count of active human work — most entries are small, and any agent or person can pick one up.

Board projected at 2026-08-20T23:46:48Z, and rendered into this page at build time. The projection refreshes hourly; this page refreshes when the site rebuilds, so it can trail the board.

**25** — shown

**336** — not started

**4** — already claimed

**132** — PRs (not claimable)

17.30

**[Cut the signing release (consume accumulated changesets) + add \`PRX\_PROVENANCE\_KEY\` repo secret](https://github.com/bounded-systems/prx/issues/434)** — prx · 434

17.18

**[CLI: first-class enum input -> flag (single --mode=a|b for a one-axis choice)](https://github.com/bounded-systems/verbspec/issues/13)** — verbspec · 13

16.75

**[feat(prx): ephemeral push credential via GitHub App installation tokens (keeperd)](https://github.com/bounded-systems/prx/issues/215)** — prx · 215

16.75

**[credential file is protected by ACL/hook layers, not a real capability boundary (fd/memfd hand-off blocked on harness support)](https://github.com/bounded-systems/claude-box/issues/195)** — claude-box · 195

16.52

**[fix(ci): release-binary \`image\` (GHCR push) job fails — non-blocking but red](https://github.com/bounded-systems/prx/issues/348)** — prx · 348

16.52

**[Flip keeper-wire contract-check to blocking once upstream drift is fixed](https://github.com/bounded-systems/trellis/issues/2)** — trellis · 2

15.75

**[Headless planner (prx plan agent) ignores the work unit's issue body and confabulates a parity-chain/XState plan from its system prompt](https://github.com/bounded-systems/prx/issues/230)** — prx · 230

15.75

**[Wire the PR-open capability into the ticket→PR dispatch story](https://github.com/bounded-systems/claude-box/issues/220)** — claude-box · 220

15.75

**[Fresh-machine consumers can't obtain the box image: private GHCR packages + unqualified claude-box:latest pod default](https://github.com/bounded-systems/claude-box/issues/245)** — claude-box · 245

14.95

**[chore: add a top-of-file doc comment to packages/prx/src/intake/intake-source.ts](https://github.com/bounded-systems/prx/issues/270)** — prx · 270

14.90

**[Confusing: \`site\` is cloned locally as \`bounded.tools/\`, and a separate \`bounded-systems/bounded.tools\` repo exists](https://github.com/bounded-systems/site/issues/32)** — site · 32

14.90

**[Embedded webfont token (vs the system stack)](https://github.com/bounded-systems/synoptic/issues/4)** — synoptic · 4

14.90

**[docs: how to bootstrap a first release + the tag-creation-actor requirement](https://github.com/bounded-systems/mint/issues/18)** — mint · 18

14.85

**[Verify --remote-serve end-to-end on-device](https://github.com/bounded-systems/claude-box/issues/131)** — claude-box · 131

14.85

**[Smoke-test v0.7.0 door images on a Linux host (Layer 2/2b)](https://github.com/bounded-systems/claude-box/issues/132)** — claude-box · 132

14.80

**[axe / real-a11y verification wired into the gate](https://github.com/bounded-systems/synoptic/issues/1)** — synoptic · 1

14.80

**[audit: mint-released repo ⇒ release identity can create v\* tags (implements trellis#34)](https://github.com/bounded-systems/conformance/issues/25)** — conformance · 25

14.80

**[Delta sync: cut the 1,314-point full-board pull](https://github.com/bounded-systems/front-desk-scheduler/issues/1)** — front-desk-scheduler · 1

14.75

**[pilot loops on the implement stage → abandons: tester leg is served the executor profile + plan, not a test session](https://github.com/bounded-systems/prx/issues/360)** — prx · 360

14.70

**[Real pilot (PRX\_PILOT\_REAL) hangs in the submit/CI leg after a correct implement (no error, no progress)](https://github.com/bounded-systems/prx/issues/261)** — prx · 261

14.15

**[Decide: operator commit signing on by default? (ledger 7.1)](https://github.com/bounded-systems/trust/issues/5)** — trust · 5

13.87

**[keeperd slice 4: in-VM signing key — gen in VM, register pubkey via gh (security review APPROVED, conditions a+b)](https://github.com/bounded-systems/prx/issues/236)** — prx · 236

13.85

**[Close the coverage gap: promote high-value homepage copy into content/strings.json](https://github.com/bounded-systems/site/issues/40)** — site · 40

13.55

**[Wire window-burn metering (consumedPoints per window)](https://github.com/bounded-systems/gh-project-room/issues/10)** — gh-project-room · 10

13.55

**[Formalize tonight's dogfooding: recurring capability-boundary verification, not one-off probing](https://github.com/bounded-systems/claude-box/issues/200)** — claude-box · 200

Held back: 4 already claimed; 132 pull request(s), which are changes awaiting a check rather than work to pick up; 175 ranked below the 25 shown.

## How to take one

Work is claimed through a door, not by announcing it: dispatch `claim-ticket.yml` with the repo, issue and a claimant, then check the issue itself — the claim exists only if the comment there names you. An issue carrying an assignee or the `claimed` label is someone else's.
