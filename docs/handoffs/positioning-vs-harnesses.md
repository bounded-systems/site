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

## Distribution: submit to `awesome-harness-engineering`

[`ai-boost/awesome-harness-engineering`][awesome] is a curated, problem-first
list (its `AGENTS.md` organizes by *the problem being solved, not by vendor*, and
excludes marketing content — entries must be opinionated and justify inclusion).
Its top-level **"Security, Sandbox & Permissions"** section already lists tools
alongside standards, but everything in it is **policy / identity** authorization
(OAuth, SPIFFE, PEP/PDP decision points, intent-taxonomy allow/deny, classifiers).
There is **no object-capability implementation** in the section — which is exactly
prx's distinct mechanism, and the opinionated hook for inclusion.

Lead with a **single** entry (guest-room, the flagship) — one well-justified
entry respects the list's anti-spam ethos better than submitting three repos, and
the capability *runtime* is the cleanest fit for this section. Add prx only if the
at-scale implementation is worth representing too. Notes below are written to our
own grading (no over-claiming), which also satisfies the list's anti-marketing rule.

**Recommended entry — "Security, Sandbox & Permissions":**

```markdown
- [guest-room](https://github.com/bounded-systems/guest-room) — Object-capability runtime for AI agents: the agent holds an unforgeable reference to a *door*, never the credential behind it, and a broker performs the privileged act. Rooms expand to exactly the doors a job holds, attenuation narrows them append-only (authority only ever tightens as it's handed inward), and confinement binds a capability to its provider's lease. A capability model rather than the allow/deny lists and PEP/PDP policy layers most of this section covers; behaviour specs execute against the engine, so the docs can't drift from the code.
```

**Optional second entry — same section:**

```markdown
- [prx](https://github.com/bounded-systems/prx) — guest-room's model run at scale: capability-scoped agents drive each work unit to a merged PR, with git-writes carrying per-actor, content-addressed provenance verified fail-closed at the merge gate, so every effect is attributable.
```

**How to submit:** fork `ai-boost/awesome-harness-engineering`, add the line(s)
under "Security, Sandbox & Permissions", verify the URL resolves, open a PR.
(Can't be done from the site session — its GitHub access is scoped to
`bounded-systems/site` only; this is a manual outbound contribution.)

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
[awesome]: https://github.com/ai-boost/awesome-harness-engineering
