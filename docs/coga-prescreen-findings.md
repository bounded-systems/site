# COGA pre-screen findings (agent heuristic) — bounded.tools

An **automated cognitive-barrier pre-screen** of the live site, run by AI agents
against the W3C [_Making Content Usable_](https://www.w3.org/TR/coga-usable/)
objectives, **before** the human usability test. Its job is to clear obvious
barriers so participants spend their session on the hard journeys, not on typos.

> **This is not conformance evidence.** An agent is not a person with a cognitive
> or learning disability, and a heuristic pre-screen cannot stand in for testing
> with real people. The cognitive usability-testing row in
> [`CONFORMANCE.md`](https://github.com/bounded-systems/lone/blob/main/CONFORMANCE.md)
> stays `not-assessed` until real, verified human evidence exists. These findings
> feed the static `LONE_COGA_*` budget and a pre-test fix backlog only.

Three agents audited: plain-language/readability, findability/link-purpose/choice-density, and a cold-comprehension probe of the six task scenarios in [`coga-test-tasks.md`](coga-test-tasks.md).

## High — comprehension path (fix before human testing)

- **Hero lead + "The bet" + "The model" read above ~grade 12.** Long compound
  sentences, abstract noun stacks. Highest-traffic comprehension journey.
- **Undefined jargon on first use:** _capability model, reference monitors,
  seccomp, bifurcation, seam, privileged effects, attenuation, conformance
  projection_ — plus an acronym run (_MCP, DSSE, in-toto, SLSA, SBOM, SPDX,
  SHACL, OIDC, OCI_).
- **Metaphor introduced before its literal meaning** (door/room/guest, "made
  physical", "fails closed"). Reversing to literal-first resolves several at once.
- **`#proof` choice density:** ~20 interactive controls in one region with
  overlapping verbs (clone/download/browse/re-hash/verify). Surface one
  recommended action; progressively disclose the rest.

## Medium — findability & orientation

- **Primary CTA mismatch:** "Read the one idea →" lands on a section headed
  "The bet" — the user can't confirm success from the heading.
- **`/conformance` link** is mid-paragraph, labeled "conformance projection"
  (jargon), competing with inline grade chips and the `#proof` verify commands.
- **Proof cards state status, not function** ("Flagship", "At scale", "The
  guest"); the user's vocabulary ("stop the agent") appears in no card title.
- **No `aria-current` / "you are here"** on a long anchored page.
- **No skip-to-content link.**
- **404 nav** is a 3-item subset of the home page's 7 — inconsistent.
- **`mailto:` primary button** gives no signal it opens an email client.
- **Smooth-scroll has no `prefers-reduced-motion` guard.**

## Low

- Icon-only `↗` as the sole "leaves site" signal; partial-phrase blog links;
  late on-load freshness banner causing a small content shift; circular
  micro-gloss ("room = the doors it holds").

## Fix backlog (split by ownership)

**Mechanical — unambiguous, agent-applyable (no brand-voice judgement):**
skip-link · `aria-current` scroll-spy · `prefers-reduced-motion` guard ·
external-link + `mailto` signalling · 404 nav parity · reserve space for the
freshness banner.

**Editorial — owner review (brand voice):** plain-language rewrites of the hero
lead / "The bet" / "The model"; expand or defer the acronym run; gloss the four
coined terms (door, room, guest, seam) literal-first; rename the "Read the one
idea" CTA to confirm its destination; retitle proof cards by what they do.

---

_Method: AI-agent heuristic pre-screen, source-only, no human participants.
Recorded under the COGA epic as non-gating. Severity is the agents' estimate, not
a graded verdict._
