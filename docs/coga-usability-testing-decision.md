# COGA usability testing — decision: not pursued (row stays not-assessed)

**Date:** 2026-06-28
**Criterion:** `cognitive.coga-usability-testing` (lone [`CONFORMANCE.md`](https://github.com/bounded-systems/lone/blob/main/CONFORMANCE.md), Cognitive / W3C COGA row, footnote 4)
**Status:** `not-assessed` — **by decision**, not merely "not yet done"

## Decision

bounded.tools is **not pursuing real-participant COGA usability testing at this
time.** The recruitment-route-and-budget gate and the moderated-session track are
called off. Accordingly, the cognitive usability-testing row remains
`not-assessed` in the conformance envelope — which is also its default, since lone
never marks an external criterion `met` without supplied, independently verified
evidence.

We are **not** substituting automation or an LLM for this row. The
[agent pre-screen](coga-prescreen-findings.md) was, and remains, explicitly
**not conformance evidence**: an AI agent is not a person with a cognitive or
learning disability, and a heuristic pass cannot stand in for testing with real
people. Recording an automated result as if it satisfied this row would be an
overclaim. The row stays honest by staying `not-assessed`.

## Real-participant testing is still necessary

This is the important part, and the reason the row is left open rather than
quietly retired:

> **Usability testing with people who have cognitive and learning disabilities is
> the necessary path to any genuine cognitive-accessibility validation.** Per W3C
> [_Making Content Usable_](https://www.w3.org/TR/coga-usable/) and
> [_Cognitive Accessibility User Research_](https://www.w3.org/TR/coga-user-research/),
> there is no automated, heuristic, or model-based shortcut that can resolve this
> row to `met`. The only thing that can is real, task-based evidence from
> participants across a range of cognitive/learning profiles, with an independent
> verifier named — self-asserted "we tested it" does not gate.

So this decision is a deferral of *effort and budget*, not a downgrade of the
*requirement*. The row remaining `not-assessed` is the site telling the truth:
the cognitive-accessibility claim is **not** made, because the evidence that
would justify it does not exist yet.

## What stays done

The mechanical and editorial pre-test work already shipped and stands on its own
merits (it improves the site regardless of the testing decision):

- Mechanical a11y fixes — skip-link, reduced-motion guard, external/mailto
  signalling, generated single-source nav with 404 parity.
- Editorial plain-language rewrites of the hero, "The bet", "The model", CTA, and
  proof-card titles.
- The [six task scenarios](coga-test-tasks.md) and the
  [agent pre-screen findings](coga-prescreen-findings.md) — retained as a
  pre-test backlog should real-participant testing be picked back up.

## To reopen

Reopening means restarting the real-participant track: choose a recruitment route
and budget, recruit 5–8 participants across a range of profiles, run moderated
think-aloud sessions over the task scenarios, and record the result in the lone
conformance envelope with an independent verifier named. Only then does the row
move off `not-assessed`.
