# COGA usability test — task scenarios (bounded.tools)

The site-specific task list for the cognitive usability test. Methodology,
participant profiles, session structure, and ethics live in the lone guide:
[`docs/testing/coga-usability-testing.md`](https://github.com/bounded-systems/lone/blob/main/docs/testing/coga-usability-testing.md).
This fills its "critical journeys" section for **bounded.tools** — the static
"read this first" entry site.

Tasks are **goal-shaped and non-leading**: the participant is given an intent in
their own terms, never UI directions. The moderator stays silent unless the
participant is about to abandon; a **facilitator rescue** means the task did not
pass unaided. bounded.tools is comprehension-heavy (a dense pitch about agent
authority and graded claims), so the load-bearing risk is **understanding**, not
just navigation.

## Tasks

### 1. Understand what this is (core comprehension)

> You've just landed on this page for the first time. Take as long as you like,
> then tell me in your own words: what does this do, and who is it for? Is it
> something that could help you?

- **Probes:** the headline + intro + "the model" sections.
- **Pass:** participant can restate the core idea ("keeps an AI coding agent
  inside the task you gave it") and say whether it's relevant to them, without a
  rescue.
- **COGA risk:** abstract framing ("privileged effects attributable to a signed
  owner", "one source of truth projects to many surfaces") — language load,
  unfamiliar vocabulary.

### 2. Read "the one idea"

> The page offers to show you its "one idea." Find it, read it, and afterwards
> tell me what that single main idea is.

- **Probes:** the primary CTA ("Read the one idea →" → `#bet`) and comprehension
  of that section.
- **Pass:** participant reaches the section and states one main idea; not a
  verbatim quote — a genuine restatement.
- **COGA risk:** primary-action findability; whether the idea survives one read.

### 3. Decide whether a claim is trustworthy

> The site says its claims are "graded against the running code." Find where you
> could check that for yourself, and tell me whether you'd believe a specific
> claim it makes.

- **Probes:** `#honesty` → `/conformance` navigation, and comprehension of the
  proof/grading concept.
- **Pass:** participant gets to the conformance/proof surface and forms a
  judgement, articulating what "graded" means to them.
- **COGA risk:** the densest, most jargon-heavy journey — high working-memory and
  literacy load; clear link purpose matters.

### 4. Find the tool for your problem

> You want the tool this project offers for stopping an AI agent from doing
> things you didn't ask it to. Find it, and get to where you'd learn more or try
> it.

- **Probes:** the `#proof` cards (prx / guest-room / claude-box) — findability and
  link-purpose clarity.
- **Pass:** participant reaches a relevant project without a rescue and can say
  why they picked it.
- **COGA risk:** choosing among similar-looking cards; whether labels state
  purpose plainly.

### 5. Get in touch

> You've decided you'd like to ask a question. Get to the point where you could
> contact the person behind this.

- **Probes:** the "Get in touch" CTA → `mailto:hello@bounded.tools`.
- **Pass:** participant locates the contact path without a rescue.
- **COGA risk:** low — primarily a findability check on the main conversion.

### 6. Read the longer thinking _(optional, time permitting)_

> Find something longer to read that explains the thinking behind this, and read
> the first part of it.

- **Probes:** the blog index and a post; long-form comprehension.
- **Pass:** participant reaches a post and can summarise its opening.
- **COGA risk:** sustained reading load; heading structure and chunking.

## Recording

Run 1–5 (6 if time allows) with each participant per the lone guide. Capture
unaided completion, rescue events, observed barriers (mapped to
Making-Content-Usable objectives), and self-reported difficulty. The aggregate
feeds the lone conformance envelope's cognitive usability-testing row with a
named verifier — see [`data/conformance-evidence.json`](../data/conformance-evidence.json).
