# Handoff: re-lede the public profiles with usage + the problem (T2 / T3)

**Status:** ready to apply (paste) · **Targets:** `bounded-systems/.github` →
`profile/README.md` (T2, the public org landing page) and
`bounded-systems/.github-private` (T3, members-only).

**Why this exists.** The M0 cold read (Stan) said the door/key/room metaphor *is*
what repels at the front door ("ick… every time I'm interested"), and that the
value only landed once it was stated as **usage + the problem**: *"focus on usage
and the problem it's solving for you."* The site hero was re-leded that way
(bounded.tools PR #27). The org profile must say the **same first thing** so the
two surfaces are in lockstep. This supersedes the earlier "lead with the door
thesis" guidance where they touch the same lines; it keeps the lineage and the
honesty grader.

> **Out-of-scope-here note:** these are separate repos. This session is scoped to
> `bounded-systems/site`, so the content is finished here and applied from a
> session scoped to `.github` / `.github-private` (kickoff prompts at the bottom).

---

## The shared lede (use verbatim on both the site and the profile)

This is the wording shipped to the site hero — reuse it so the surfaces match.

> **Your coding agent wanders. Keep it inside the job you gave it.**
>
> Hand an AI coding agent a real task and it will reach past it — touching files
> you didn't mean to expose, running a command you didn't intend, doing something
> you never asked for. Today it does all of that with **your** access. Bounded
> Systems scopes that down: each kind of system power — git, the shell, your
> environment, your tools — gets one sanctioned access point that checks your
> policy, acts or refuses, and records what happened.
>
> It's a capability model — the idea behind reference monitors and seccomp — put
> in front of an agent's authority, not an allow/deny policy layer bolted on after
> the fact. Where a policy engine like **OPA/Rego** decides *yes or no* and a
> sandbox like **Docker/seccomp** draws a wall around the whole process, Bounded
> Systems draws authority at the **capability** itself: the agent holds a reference
> to one narrow door, never the credential behind it.

(Mechanism words — capability, attenuation, broker, lease — stay. The
room/door/key *metaphor* moves below the fold, grounded against the mechanism,
never as the pitch.)

---

## T2 — `bounded-systems/.github` → `profile/README.md`

**Current state (per the cold-read hand-off):** opens *"Keeping AI agents honest
when they build and ship software,"* then a door/room metaphor block ("A *door* is
a single unit of authority… never the keys behind it"), a Start-here
(guest-room → prx), a 26-package table, and an Enforced/Partial/Aspirational
honesty grader.

**Edits (editorial rules 1–6):**

1. **Replace the top block** — from "Keeping AI agents honest…" through the
   metaphor lines — with the **shared lede above** (rule 1, lead with usage; rule
   2, demote the metaphor; rule 3, name OPA/Rego + Docker/seccomp).
2. **Move the door definition below the fold**, or cut it to its mechanism. Keep
   it only where it's grounded against the capability model, never as the opener.
3. **Add a prominent "Get started"** right under the lede (rule 6) so it reads as a
   real, runnable tool — not a concept:
   > **Get started:** [guest-room START-HERE](https://github.com/bounded-systems/guest-room#readme)
   > — clone the runtime and watch its behaviour specs execute against the engine.
4. **Keep** the Start here, the package table, the honesty grader, and the Links.
5. **Name the lineage once** (rule 5 / carried from `public-profile-readme.md`):
   the model descends from object-capability security and macaroons/Biscuit-style
   attenuating credentials — one sentence, near the capability paragraph.
6. **Lane C honesty:** git-writes are signed today; egress (`net`) and external
   reads (`scout`) are the named gap. **Never** "every privileged effect."
7. **Kill AI-isms; proof-read** (rule 4): no "the easy part… the hard part," no
   "it isn't X — it's Y," no rule-of-three.

**Acceptance (T2):**
- [ ] Leads with usage + the problem; no metaphor above the fold.
- [ ] Get-started → guest-room START-HERE present; reads as a real tool.
- [ ] Start here + table + grader + Links intact; ocap/macaroon lineage named once.
- [ ] OPA/Rego + Docker grounding present; no AI-isms; Lane C honest; proof-read.

---

## T3 — `bounded-systems/.github-private`

**Lowest priority, partly a no-op** — both pages are members-only, not the
stranger funnel the cold read is about. Don't spend front-door effort here.

- **`README.md`** (two-line stub) is fine. Optional: add one line pointing to the
  org map / `docs/handoffs/` so a member knows where the work lives. Proof-read.
- **`profile/README.md`** (members page) already leads with the door thesis. The
  audience knows the ontology, so the metaphor is **fine to keep** here — only
  (a) proof-read, and (b) check it doesn't contradict the re-leded public
  surfaces (e.g. don't let the internal page be the only one still selling
  "honest" as the headline). No re-lede required.

**Acceptance (T3):**
- [ ] `README.md` proof-read; optional org-map/handoffs pointer added.
- [ ] `profile/README.md` left metaphor-forward (internal audience), proof-read,
      consistent with the public re-lede.

---

## Kickoff prompts (run each in a session scoped to its repo + `.github-private`)

**T2 — public profile:**
```
Apply T2 of docs/handoffs/legibility-profile-relede.md. In
bounded-systems/.github -> profile/README.md: replace the "Keeping AI agents
honest" top block (through the door-metaphor lines) with the shared usage/problem
lede from that handoff; demote the door definition below the fold; add the
Get-started -> guest-room START-HERE pointer; keep Start here + table + honesty
grader + Links; name the ocap/macaroon lineage once; OPA/Rego + Docker grounding;
no "every privileged effect" claim; no AI-isms; Lane C honest; proof-read. One
draft PR against main.
```

**T3 — members repo:**
```
Apply T3 of docs/handoffs/legibility-profile-relede.md. In
bounded-systems/.github-private: proof-read README.md (optionally add a one-line
pointer to the org map + docs/handoffs/), and proof-read profile/README.md
leaving its internal metaphor-forward framing intact, only checking it doesn't
contradict the re-leded public surfaces. Low priority; one small PR.
```
