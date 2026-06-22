# Handoff: position Bounded Systems against other agent harnesses

**Status:** open · **Target repo:** `bounded-systems/prx` (README) + `bounded-systems/brand` (messaging) · **Source:** competitive scan during the `bounded.tools` messaging pass (site branch `claude/website-messaging-ux-gu23c8`)

## Why this exists

"AI coding agent harness" is now a crowded category, but most entrants optimize
**efficiency**, not **authority**. Bounded Systems is the odd one out — and that's
the differentiator. Naming where it fits answers the same "what is this / why
would I use it?" question that drove the site rewrite. The site now carries a
one-line version of this; the full positioning belongs in the prx README and the
brand messaging so the surfaces stay consistent.

## The landscape (June 2026)

Three recent harness projects, three different layers:

| Project | Governs… | Mechanism | Headline claim |
| --- | --- | --- | --- |
| **Headroom** ([chopratejas/headroom]) | what the agent **reads** | compresses tool output, logs, RAG, files before the LLM sees them; library / proxy / MCP / wrapper | 60–95% fewer tokens, same answers |
| **Ponytail** ([DietrichGebert/ponytail]) | what the agent **writes** | a "lazy senior dev" decision ladder (YAGNI → stdlib → … → minimum); prompt/skill ruleset | 80–94% less code, 3–6× faster, cheaper |
| **Bounded Systems** (prx / guest-room) | what the agent is **allowed to do** | one sanctioned door per kind of power; broker holds the keys; every privileged effect signed + audited | every privileged action attributable, fail-closed |

Key point: these are **orthogonal and complementary**, not competitors. Ponytail
trims the output, Headroom trims the tokens, prx bounds the blast radius — they
can all run at once. Bounded Systems is the only one addressing trust,
authority, and accountability.

## Change

1. **prx README** — add a short "Where it fits" note near the top (after the
   plain what/why from the `prx-readme-value-prop` handoff): one or two sentences
   framing prx as the *authority / accountability* layer, complementary to
   efficiency harnesses. Keep it factual; don't disparage the others.
2. **brand messaging** — record the category framing ("the authority layer for
   agent harnesses") so taglines and future copy stay on-message.

Suggested one-liner (already used on the site, names omitted there on purpose):

> Other agent harnesses make the work cheaper or the output leaner. Bounded
> Systems makes it accountable — the authority layer, designed to run alongside
> the rest.

## Note on naming competitors

The homepage states the positioning **without naming** Headroom or Ponytail —
naming rivals on a landing page dates quickly and reads defensively. A README or
a blog post is the right place to name them explicitly if desired (e.g. a "how
this differs" section), since it's versioned and easy to update.

## Acceptance / verify

A reader comparing harness options can tell, in one line, that Bounded Systems
solves a *different* problem (authority/accountability) than the
efficiency-focused tools, and that the tools compose rather than compete.

## Context / sources

- Site one-liner: `index.html` `#how` section, `.fit-note` (this branch).
- [chopratejas/headroom] · [DietrichGebert/ponytail] · [awesome-harness-engineering]

[chopratejas/headroom]: https://github.com/chopratejas/headroom
[DietrichGebert/ponytail]: https://github.com/DietrichGebert/ponytail
[awesome-harness-engineering]: https://github.com/ai-boost/awesome-harness-engineering
