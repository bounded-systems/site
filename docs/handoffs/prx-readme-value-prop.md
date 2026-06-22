# Handoff: lead the prx README with a plain-language "what / why"

**Status:** open · **Target repo:** `bounded-systems/prx` · **Source:** user-testing of `bounded.tools` (site branch `claude/website-messaging-ux-gu23c8`)

## Why this exists

A developer who uses AI coding tools daily (Copilot, Claude Code) read the
homepage and the repos and could not answer two basic questions:

1. **What is this?**
2. **Why would I use it?**

The site now leads with a plain answer — *"Give your AI agent one door, not all
your keys"*, followed by the concrete problem (your agent already writes code,
runs commands, and pushes to git with **your** access). `prx` is the flagship
and the first repo most people open after the site, so its README should answer
the same two questions in the first screen, in the same voice.

## The problem with the current opening

The README opens on the internal tagline —
*"The agent-run work-unit CLI: capability-scoped agents driving each work unit
through one signed, content-addressed pipeline to a merged PR."* That is a dense
noun phrase aimed at someone who already knows the model. A newcomer can't tell
what it's *for*.

## Change

Add (or rewrite to) a top-of-README block that, before any architecture, states:

- **One sentence, plain:** what prx is, in terms a Copilot/Claude-Code user
  recognizes — e.g. "prx runs AI coding agents with scoped authority: each agent
  reaches git, the shell, and your tools only through capability doors you grant,
  and every privileged action is signed and recorded."
- **The problem, concretely:** today an AI agent that writes your code runs with
  your full access — it can push to git, spawn subprocesses, and read your env.
  prx scopes that.
- **Why you'd use it:** attribution and an audit trail for agent-driven changes;
  a refusal instead of a surprise when an agent reaches for power it wasn't given.

Keep the existing tagline — just move it below the plain-language lead, not above
it. The Quickstart (`brew` / `nix run`) already reads well; leave it.

## Acceptance / verify

A reader who has never seen the project can, from the first screen of the README
alone, say in one sentence what prx is and why they'd use it. Keep the wording
consistent with the site hero so the two don't drift.

## Context

- Site hero + "Get started" copy: `index.html` (this site branch).
- prx README install steps the site now links verbatim: `brew tap … && brew
  install prx`, `nix run github:bounded-systems/prx -- --version`.
