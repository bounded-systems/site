# Handoff: brand voice — plain sentences, and retire the self-referential grade

**Status:** open · **Target repo:** `bounded-systems/brand` (or wherever copy/voice guidance lives) · **Source:** user-testing of `bounded.tools` (site branch `claude/website-messaging-ux-gu23c8`)

## Why this exists

Two recurring copy patterns tested badly with a working software engineer, and
they don't only appear on the site — the same voice runs through the org's
READMEs. Fixing them once as a brand-voice guideline keeps the surfaces from
drifting back.

## 1. Verbless "fragment: fragment — fragment" sentences

Much of the copy was built as stacked fragments with a colon and an em-dash and
no verb, e.g.:

> "One mechanism, not twenty. A capability seam: for each kind of system power
> there is exactly one sanctioned way through — a door you hold a socket to,
> never the keys behind it."

The direct reader reaction: *"Why do you have a colon and an em-dash in the same
sentence and no verbs?"* It reads as a brand mood, not as information.

**Guideline:** prefer plain subject–verb–object sentences. Use a colon **or** an
em-dash, rarely both in one sentence, and make sure the sentence has a verb. The
site rewrite (`index.html`, this branch) is the reference for the corrected voice
— mirror it in the prx / guest-room / claude-box READMEs.

## 2. The self-referential grade confused everyone

The line *"Every claim on this page is graded against the running code —
including this one"* (and the H2 *"…Including the claims on this page."*) landed
as a riddle: testers couldn't tell what "including this one" referred to or why
it mattered.

**Done on the site:** the honesty section keeps the genuinely useful part — the
Enforced / Partial / Aspirational grading of real claims — and drops the
self-referential "including this one" gimmick. The H2 is now a plain sentence:
*"Every claim here is graded against the running code."*

**Guideline:** keep the grading device (it's good and honest); retire the
self-referential framing wherever it appears in READMEs and marketing copy.

## Acceptance / verify

A first-time reader can read any top-level paragraph aloud and have it parse as a
normal sentence, and nobody has to ask what "including this one" means.

## Context

- Reference voice: `index.html` hero, `#how`, and `#honesty` (this site branch).
