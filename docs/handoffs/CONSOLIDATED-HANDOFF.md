# Bounded Systems — consolidated handoff

**One document, four destinations.** Everything routed out of the `bounded.tools`
messaging + UX pass, with finished paste-ready content. Hand each section to the
repo named in it.

**Source:** user-testing of `bounded.tools` with a working software engineer who
uses AI coding tools daily, but couldn't tell — from the site or the repos —
*what* Bounded Systems is, *why* she'd use it, or *how* to start.

**Already shipped on the site** (PR #15, merged): hero leads with a plain
what/why headline and surfaces the room·door·guest figure first; verbless copy
rewritten to plain sentences; the confusing self-referential "…including this
one" removed; a one-line "where it fits" positioning note added. The brand-owned
`tagline`/`description` tokens were kept verbatim (they're CI-enforced) — see §3.

| # | Ticket | Target repo | Status |
| - | ------ | ----------- | ------ |
| 1 | README value-prop (plain what/why) | `bounded-systems/prx` | open |
| 2 | Copy-pasteable Quickstart | `bounded-systems/guest-room` | open |
| 3 | Voice: plain sentences + retire the self-referential grade; token rewrites | `bounded-systems/brand` | open |
| 4 | Submit to the harness-engineering awesome list | `ai-boost/awesome-harness-engineering` | open |

> **Why these aren't already PRs in those repos:** the session that produced this
> was scoped to `bounded-systems/site` only. Apply by paste, or re-run an agent
> with these repos in scope.

---

## 1 · prx — lead the README with a plain "what / why"

**Target:** `bounded-systems/prx`

**Problem.** The README opens on the internal tagline — *"The agent-run work-unit
CLI: capability-scoped agents driving each work unit through one signed,
content-addressed pipeline to a merged PR."* That's a dense noun phrase for
someone who already knows the model; a newcomer can't tell what it's *for*.

**Change.** Replace the opening (heading + tagline + first paragraph) with the
block below. It keeps the existing tagline — demoted to a blockquote under the
plain lead — and leaves the Quickstart untouched.

````markdown
# prx

**prx runs AI coding agents with scoped authority.** Each agent reaches git, the
shell, your environment, and your tools only through capability *doors* you grant
— never your full access — and every privileged action is signed and recorded.

Today an AI agent that writes your code also runs with your permissions: it can
push to git, spawn subprocesses, and read your secrets. prx narrows that to one
sanctioned door per kind of power, so you get attribution and an audit trail for
agent-driven changes — and a refusal, not a surprise, when an agent reaches for
power it was never given.

> The agent-run work-unit CLI: capability-scoped agents driving each work unit
> through one signed, content-addressed pipeline to a merged PR — git-writes
> signed and verified against their owner. A Bun + TypeScript monorepo, plus the
> `@bounded-systems/*` libraries it builds on.

## Quickstart

```sh
brew tap bounded-systems/prx https://github.com/bounded-systems/prx
brew install prx
# or:
nix run github:bounded-systems/prx -- --version
```
````

**Done when** a reader who has never seen the project can, from the first screen
alone, say in one sentence what prx is and why they'd use it — in the same voice
as the site hero.

---

## 2 · guest-room — add a copy-pasteable Quickstart

**Target:** `bounded-systems/guest-room`

**Problem.** guest-room is the flagship (the capability runtime everything else
is built on), but it has **no copy-pasteable Quickstart** — the reader most
likely to want to *run* the model after the site has nowhere to start.

**Change.** Add this as a top-level **Quickstart**. It's grounded in the real
repo: guest-room is a TypeScript library whose Gherkin specs execute against the
engine via `bun test`, so the shortest honest start is "clone, install, watch the
specs run," plus a library snippet.

> ⚠️ The `expandRoom` / `attenuate` snippet mirrors the homepage code sample;
> confirm the exact signatures against the specs before publishing — the specs
> are the source of truth, so if they differ, the specs win.

````markdown
## Quickstart

guest-room is the capability engine, with its behaviour specs executable against
it. The fastest way to see it work is to run the specs:

```sh
git clone https://github.com/bounded-systems/guest-room
cd guest-room
bun install
bun test   # the Gherkin specs execute against the engine — each scenario is a test
```

Every scenario is real behaviour: a room expanding into exactly the doors it
holds, attenuation tightening a door, a denied door failing closed. Because the
specs run against the engine, the docs can't drift from the code.

Use it as a library:

```ts
import { expandRoom, attenuate } from "@bounded-systems/guest-room";

const doors    = expandRoom(rooms, catalog, "dev", env);     // exactly the doors this room holds
const narrowed = attenuate(doors[0], ["host=github.com"]);   // append-only: authority only tightens
```

Exact signatures live in the specs (`bun test`) — they're the source of truth.
````

**Done when** the Quickstart exists; then add guest-room to the site's "Start
here" surface the way prx and claude-box are linked.

---

## 3 · brand — plain sentences, retire the self-referential grade, reword the tokens

**Target:** `bounded-systems/brand` (or wherever copy/voice guidance lives)

Two copy patterns tested badly, and they recur across the org's READMEs — so the
fix belongs in the brand, once.

**3a. Verbless "fragment: fragment — fragment" sentences.** e.g. *"One mechanism,
not twenty. A capability seam: for each kind of system power there is exactly one
sanctioned way through — a door you hold a socket to, never the keys behind it."*
Reader reaction: *"Why is there a colon and an em-dash in one sentence and no
verbs?"*
**Guideline:** prefer plain subject–verb–object sentences; use a colon **or** an
em-dash, rarely both in one sentence; every sentence gets a verb. The merged
`index.html` is the reference voice — mirror it in the prx / guest-room /
claude-box READMEs.

**3b. The self-referential grade confused everyone.** *"Every claim on this page
is graded against the running code — including this one"* read as a riddle.
**Done on the site:** kept the Enforced/Partial/Aspirational grading of real
claims; dropped the "including this one" framing; H2 is now *"Every claim here is
graded against the running code."*
**Guideline:** keep the grading device; retire the self-referential framing in
READMEs and marketing copy.

**3c. The tagline + description are now CI-enforced brand tokens.** The site's
`content.mjs` gate requires the homepage to contain the brand's exact `tagline`
and `description`. So the site can't reword them without failing CI, and
shouldn't — the brand owns them. Proposed verb-driven rewrites (pick or adjust):

- **tagline** — `Bounded authority for AI agents`
  - → `Scope what your AI agent can do.`
  - → `Give AI agents one door, not all your keys.`
- **description** — `Capability security for AI agents — authority drawn at the door, not the process or container. Every claim graded against the running code.`
  - → `Bounded Systems scopes what an AI agent can do: one sanctioned door per kind of system power, every privileged action signed and recorded, and every claim graded against the running code.`

Changing a token here propagates to every surface that reads it (site meta,
llms.txt, READMEs) on the next sync — the intended single-source mechanism.

**Done when** any top-level paragraph reads aloud as a normal sentence, nobody
asks what "including this one" means, and the `tagline`/`description` tokens each
read as a sentence with a verb.

---

## 4 · ai-boost/awesome-harness-engineering — submit by problem

**Target:** `ai-boost/awesome-harness-engineering` (third-party; manual PR)

The list is curated **by problem, not by vendor**, and its "Security, Sandbox &
Permissions" section is entirely **policy/identity** authorization (OAuth, SPIFFE,
PEP/PDP, allow/deny, classifiers). There is **no object-capability
implementation** in it — which is exactly Bounded Systems' distinct mechanism and
the opinionated hook the list asks for. Lead with one entry (guest-room, the
flagship and the cleanest fit); add prx only if the at-scale implementation is
worth a second line. Notes are written to our own grading (no over-claiming),
which also satisfies the list's anti-marketing rule.

**Recommended entry — "Security, Sandbox & Permissions":**

```markdown
- [guest-room](https://github.com/bounded-systems/guest-room) — Object-capability runtime for AI agents: the agent holds an unforgeable reference to a *door*, never the credential behind it, and a broker performs the privileged act. Rooms expand to exactly the doors a job holds, attenuation narrows them append-only (authority only ever tightens as it's handed inward), and confinement binds a capability to its provider's lease. A capability model rather than the allow/deny lists and PEP/PDP policy layers most of this section covers; behaviour specs execute against the engine, so the docs can't drift from the code.
```

**Optional second entry — same section:**

```markdown
- [prx](https://github.com/bounded-systems/prx) — guest-room's model run at scale: capability-scoped agents drive each work unit to a merged PR, with git-writes carrying per-actor, content-addressed provenance verified fail-closed at the merge gate, so every effect is attributable.
```

**How to submit:** fork the repo, add the line(s) under "Security, Sandbox &
Permissions", verify the URL resolves, open a PR. The homepage states this
positioning **without naming** the other harnesses on purpose — a README or blog
post is the right place to name them, not the landing page.

---

### Context: where this fits among other harnesses

Recent AI-coding-agent harnesses each govern a different layer, so they compose
rather than compete:

| Project | Governs… | Headline |
| --- | --- | --- |
| [Headroom](https://github.com/chopratejas/headroom) | what the agent **reads** (context) | 60–95% fewer tokens |
| [Ponytail](https://github.com/DietrichGebert/ponytail) | what the agent **writes** (output) | 80–94% less code |
| **Bounded Systems** | what the agent is **allowed to do** (authority) | every privileged effect signed + attributable |

The per-ticket detail also lives in the sibling files in this directory
(`prx-readme-value-prop.md`, `guest-room-quickstart.md`,
`brand-voice-plain-sentences.md`, `positioning-vs-harnesses.md`).
