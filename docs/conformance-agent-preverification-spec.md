# Spec: agents against the not-assessed conformance rows

**Date:** 2026-06-28
**Status:** spec / [NEEDS CLARIFICATION] markers inline
**Context:** bounded.tools is at **12/27 met · 0 unmet · 15 not-assessed**. This spec
defines how we use **agents** to attack the not-assessed rows — and, just as
importantly, where agents are *not allowed* to move the needle.

## The invariant (non-negotiable)

> **An agent run NEVER sets a criterion to `met`.** Agents pre-screen, triage, and
> prepare. `met` requires the gate or the named human/external verifier per the
> `verifiedBy` discipline in lone's `CONFORMANCE.md`. An agent may surface a
> *candidate failure* (→ fix backlog), but absent a verifying gate or human pass the
> row stays `not-assessed` — never silently `met`.

This is the same line we drew for COGA this session (agent pre-screen + protocol
trial were explicitly *not* evidence). This spec generalizes that discipline to
every human-gated row.

Two distinct agent roles, by row type:
- **Static / automatable rows** → an agent (or a deterministic script) *can* produce
  the gate-backed evidence that legitimately moves the row to `met`, because the
  evidence is machine-checkable and re-proven in CI. Here the "agent" is really a
  fail-closed gate.
- **Human-gated rows** → an agent can only *pre-verify*: produce a structured
  pre-screen + a readiness report for the human verifier. Row stays `not-assessed`.

---

## Part A — Static rows: gates to wire (these CAN reach `met`)

Five rows are reachable by engineering alone — no external party. Each becomes a
**fail-closed CI gate** + an `evidence` key in `data/conformance-evidence.json`,
mirroring the axe/SBOM pattern (the gate re-proves it every build, so it cannot
drift without turning CI red). Implement as **independent PRs**, not a bundle.

| Row | Tool / method | Evidence shape | Effort | Notes |
|---|---|---|---|---|
| `html.validator-clean` | Nu HTML Checker (`vnu`) over `dist/**/*.html` | `{ errors: 0 }` | M | needs the vnu jar in the toolchain; fail closed on any error |
| `semantic.commonmark` | CommonMark conformance check of the Markdown siblings | `{ conforms: true }` | S | dovetails with **prx-u9uf** (AI-readability gate) |
| `security.no-critical-vulns` | `osv-scanner` (or `npm audit --json`) over the lockfile | `{ critical: 0, high: 0 }` | S | most self-contained; good first PR |
| `integrity.slsa-provenance` | Emit + sign an in-toto/SLSA provenance in `deploy.yml` | `{ present: true, signed: true }` | M | you already cosign the SBOM + site manifest — same keyless move |
| `compatibility.baseline` | Compute Baseline status of the web-features used | `{ baseline: "high"\|"low" }` | M | needs `web-features` data; static site uses a small feature set |

**Not in this set (don't fake them):** `performance.core-web-vitals` needs real-user
**field** data (CrUX/RUM — hard on low traffic) and `reliability.runtime` needs
monitoring history. Leave `not-assessed` until that data exists. Optional rows
(`*.aaa-selected`, `openapi`, `feeds`, `ipfs-cid`, `http-rfc9110`) only apply if we
choose to publish them — `semantic.feeds` is already in scope via **prx-5n0g**.

**Wiring note:** each row also needs lone's `conformance()` model to map the new
evidence key → criterion. [NEEDS CLARIFICATION: confirm whether these evidence keys
already exist in lone's schema or require a lone PR first.]

---

## Part B — Human-gated rows: agent pre-verification (these STAY `not-assessed`)

Three rows need human/external evidence. Agents pre-verify only.

### B1. `a11y.wcag22-aa-manual` — manual WCAG 2.2 AA audit
- **Agent method:** walk the **non-automatable** AA success criteria (the ones axe
  can't fully verify) per page, emitting a per-SC verdict + cited evidence:
  1.1.1 (alt meaningfulness), 1.3.1/1.3.2 (info & relationships / sequence beyond
  parser), 1.3.3 (sensory), 1.4.1 (use of colour), 1.4.4/1.4.10/1.4.12 (resize /
  reflow / text-spacing), 1.4.13 (content on hover/focus), 2.1.1 (keyboard reachable),
  2.4.3 (focus order), 2.4.4/2.4.6 (link purpose / heading & label clarity),
  2.4.5 (multiple ways), 2.4.7 (focus visible), 2.5.3 (label in name), 3.2.3/3.2.4
  (consistent nav / identification), and WCAG 2.2 adds 2.4.11 (focus not obscured),
  2.5.8 (target size min), 3.2.6 (consistent help), 3.3.7/3.3.8 (forms — mostly N/A).
- **Boundary:** the agent cannot run the **assistive-technology pass** (real screen
  reader / AT-user judgment) or sign as an independent auditor. Output = a
  per-SC pre-audit checklist + fix backlog → hands the human auditor a head start.
  Row stays `not-assessed`. Bead: **prx-tycg**.

### B2. `security.asvs` — OWASP ASVS L2
- **Agent method:** for a static, no-backend, no-auth site, **most ASVS L2 reqs are
  N/A** (no sessions, server-side input handling, or crypto-at-rest). The agent walks
  the applicable subset — V1 architecture/threat model, V14 config (TLS/HSTS/CSP via
  `dist/_headers`), V12 files/resources, V13 the published `/api/v1/*.json`, V10
  supply-chain (SBOM already present) — marking applicable / N-A with evidence, and
  produces a pre-filled ASVS checklist.
- **Boundary:** an ASVS *verification* attestation requires an **independent
  assessor**; agent self-assessment is not that. Row stays `not-assessed`; output
  pre-fills the assessor's work.

### B3. `cognitive.coga-usability-testing` — COGA usability testing
- **Already specced this session** — agent pre-screen (prx-wybd) + the
  [protocol trial](coga-protocol-trial.md). Firmest boundary: agents are not people
  with cognitive disabilities. Row stays `not-assessed` **by decision** (see the
  [decision note](coga-usability-testing-decision.md)). Reuse as the template for B1/B2.

### Shared output contract (all of B)
Each pre-verification emits a structured artifact:
```
{ criterion, perItem: [{ id, verdict: "pass-candidate"|"fail-candidate"|"needs-human"|"n/a", evidence, rationale }],
  humanStepRequired: "<what a verifier must still do>", notEvidence: true }
```
Published **non-gating** (like the COGA pre-screen). The row's `not-assessed` detail
string names the artifact + the outstanding human step. [NEEDS CLARIFICATION: may a
reproducible agent-found failure set a row to `unmet` (more honest — don't hide a real
defect), or does everything stay `not-assessed` until the human pass? Default: surface
as `fail-candidate` backlog, leave row `not-assessed`, until we decide.]

---

## Part C — Execution substrate: the guest-room trial-runner (sketch)

The agent pre-screens/trials (Part B) and the persona simulations should run inside
**guest-room** — capability-scoped, reproducible, dogfooding the product.

```
trial-runner (a guest-room "room")
  guests:   N persona agents (COGA profiles) or 1 audit agent (WCAG/ASVS)
  doors (capabilities granted to each guest):
    - net:read  → fetch ONLY the target origin (bounded.tools) — no other egress
    - fs:write  → ONLY the artifact dir (the pre-screen JSON) — no repo write
    - no shell, no git, no secrets
  inputs:   task list / SC checklist / persona spec (read-only mount)
  output:   structured pre-verification artifact per the Part-B contract
  invariant carried by the room: artifacts are tagged notEvidence:true; the runner
            has no door to the conformance evidence file or to `met`.
```

Why guest-room specifically: the honesty invariant becomes **structural** — a guest
with no door to `conformance-evidence.json` *cannot* write `met`, so "agents never
gate" is enforced by capability, not by convention. That's the same argument the site
makes about agents generally.

> **Keep-separate caveat (standing guidance):** this is a *tooling/execution* choice.
> It does **not** mean COGA/accessibility work validates the prx/guest-room product,
> and the two narratives stay separate. guest-room is the sandbox the trials run in,
> not a conformance claim.

[NEEDS CLARIFICATION: does guest-room today expose a `net:read`-scoped door + an
artifact-only `fs:write` door, or is that a capability we'd need to add? Spike first.]

---

## Acceptance criteria (epic)

- [ ] Part A: each of the 5 static rows lands as an independent PR with a fail-closed
      gate + evidence key; conformance report moves them to `met`. (~12→17/27)
- [ ] Part B: each human-gated row has a documented agent pre-verification method,
      the shared output contract, and a published non-gating artifact.
- [ ] The invariant holds end-to-end: no agent run can set `met`; rows report
      `not-assessed` (or `unmet` on a verified failure) with the artifact linked.
- [ ] Part C: a guest-room trial-runner spike confirms the capability-scoped doors;
      pre-screens run inside it.
- [ ] Each not-assessed row's detail string names its artifact + the outstanding step.

## Sequencing

1. **Part A first** (cheap, real `met` gains): start with `security.no-critical-vulns`
   (most self-contained), then `semantic.commonmark` (rides prx-u9uf), then vnu,
   slsa-provenance, baseline.
2. **Part B in parallel** (doc + non-gating artifacts; no CI risk): COGA is done as the
   template; add WCAG (prx-tycg) and ASVS pre-screens.
3. **Part C** once a Part-B agent needs a real sandbox — spike the guest-room doors.

The strong WCAG 2.2 AA headline claim stays **partial** until B1's real human audit
(prx-tycg) lands — that's the only external item that unlocks it. Everything in Part A
is honest, gate-backed progress that needs no one's signature but the build's.
