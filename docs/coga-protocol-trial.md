# COGA usability test — protocol trial (dry-run)

**Date:** 2026-06-28
**What this is:** a **simulated dry-run of the test protocol** — four LLM personas
across distinct COGA profiles (literacy/dyslexia, attention/ADHD, memory/MCI, mild
intellectual disability) talked through the six [task scenarios](coga-test-tasks.md)
against the live site, moderated per the
[lone protocol](https://github.com/bounded-systems/lone/blob/main/docs/testing/coga-usability-testing.md).

> **This is NOT conformance evidence and NOT a usability finding.** A simulated
> persona is not a person with a cognitive or learning disability. A trial
> rehearses the *protocol* — it debugs the task wording, timing, and facilitator
> script so a real (paid) round isn't wasted on fixable test-design problems. The
> `cognitive.coga-usability-testing` row stays `not-assessed`. See
> [the decision note](coga-usability-testing-decision.md).

## Headline: three of the six task prompts are leading

The strongest, most convergent finding (flagged independently by multiple
personas). The current prompts quote the site's own copy or presuppose a feature,
so participants pattern-match the marketing instead of navigating — inflating the
pass rate and hiding the real barrier.

| Task | Problem | Flagged by | Non-leading rewrite |
|---|---|---|---|
| **T2 "the one idea"** | Presupposes a labeled "one idea"; the site has no such label and offers two near-peers ("The bet" *and* "The model"), so participants force-fit an answer | dyslexia, ADHD, MCI, ID | *"What's the single main point the author most wants you to take away? Where would you go to get it, and what would you say?"* |
| **T3 "graded against the running code"** | Quotes the site's exact phrase → hands the participant the search term, so findability is string-matched, not understood | **all four** | *"This site makes promises about itself. Find where it shows whether those promises are actually true, and tell me if you'd believe one."* |
| **T4 "the tool for stopping an AI agent…"** | Echoes the hero headline almost verbatim → participants match the H1, not the nav; hides that the tools (guest-room/prx/claude-box) are named in insider terms | **all four** | *"You want something that limits what your AI assistant is allowed to touch. Find what this project offers and where you'd go to learn more or try it."* |

T1 and T5 were judged well-worded and non-leading — keep them.

## Other protocol fixes

- **Split T3 into 3a + 3b.** It is secretly two steps (find *where* to check **and**
  judge belief). Memory-profile participants forget the second half; the moderator
  should re-read 3b after 3a completes.
- **Timing: 45 min is too tight; 60 min is tight.** Per-persona estimates for tasks
  1–5 ranged from ~17–22 min (attention) to **33–50 min (slower readers)** before
  think-aloud, consent, re-reads, and rescues. **Recommend a 75–90 min slot, or cut
  to 4 core tasks (drop the already-optional T6, consider splitting/short­ening T3).**
  T6 will not be reached in a 60-min session.
- **Define the rescue threshold** (it is currently undefined). Converged rule: a
  facilitator rescue = the participant (a) says they would stop/give up, **or**
  (b) goes ~60–90 s with no productive progress (nav-bouncing, re-reading the same
  block, circling between two labels). A rescue = the task did **not** pass unaided.
- **Distinguish *lost* from *drifted*** (esp. attention profiles): *lost* (can't find
  the path) = failure; *drifted* (found the path, attention wandered) = a neutral
  re-focus prompt, **not** a failure. Cap re-focus prompts at 2/task; a 3rd is itself
  a findability failure.
- **Log task re-statements separately from rescues.** Re-reading the goal verbatim on
  request is a memory accommodation, not a hint — don't count it as a rescue.

## Facilitator-script additions

- Deliver each goal as a **spoken, plain-language sentence, one at a time** — never
  written jargon. For lower-literacy participants the *written* task wording itself
  blocks; confirm goal comprehension ("tell me what I just asked") before they start.
- State accommodations up front: **re-reading, extra time, breaks, and text-to-speech
  / zoom / reader-mode are expected and fine**, recorded but never counted as a rescue.
- Offer a **standing break after T3** (heaviest load).
- Before each task, **re-orient** the participant ("you're back on the main page") —
  the long single-page scroll repeatedly cost participants their place.
- **Do not gloss jargon** (room/door/guest, quadlet, SLSA, provenance,
  Enforced/Partial/Aspirational). Needing the gloss is the accessibility signal.
- **Capture wins, not just failures.** Three spots already work for every persona and
  are the model for fixing the rest: the hero opening ("keep it inside the job you
  gave it"), the contact link's "(opens your email app)" parenthetical, and the
  "Why I built this" post opening.

## Secondary: site-design signals (pre-test backlog, not new conformance work)

Surfaced incidentally; route to the existing editorial/mechanical backlog so a real
round tests journeys, not jargon — they do **not** change the row:

- **No "Contact" in the top nav** — all four scrolled the whole page to find the
  footer email (T5 still passed, but only just).
- **No "Try it / Get started"** affordance; the tool cards link to GitHub.
- **Abstract two-word nav labels** ("The bet / The model / Honesty / Proof") and
  **insider tool names** (guest-room/prx/claude-box) don't map to a user's problem.
- **The conformance page lacks a plain-language headline verdict** — the honest
  "not-assessed = not claimed" idea is buried under a dense score table. (One persona
  actually trusted the site *more* once it parsed "12/27 met · 15 not assessed" —
  the honesty lands if it's made legible.)
- **No persistent "you are here"** on the long anchored page.
- **"Writing"** reads as indirect for "Blog/Articles."

## How this feeds a real round

These are protocol fixes only. When the real-participant track reopens (see the
[decision note](coga-usability-testing-decision.md) and the AccessWorks RFQ), the
revised, non-leading task list and the rescue/timing/facilitator rules above should
be in place first — so the paid sessions measure the site, not the test.
