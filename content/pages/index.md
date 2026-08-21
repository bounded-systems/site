<!-- Bounded Systems — a checkpoint in front of your coding agent
     / — projected from the built page by scripts/gen-markdown.mjs.
     Do not edit: change the page (or its generator) and rebuild. -->

Bounded Systems

# Your coding agent runs with your access. Bounded Systems puts a checkpoint in front of it.

Give an agent a real task and it can touch anything you can — files, git, the network. Here, every privileged action goes through one gate instead. The gate checks who is asking and what they're allowed to do, then acts or refuses. A refusal actually stops the action; either way, it's recorded.

```
agent → git push (as keeper)
  ✓ pushed
  keeper holds git-write · signed · audited

agent → git push (as scout)
  ✗ refused
  scout holds no git-write · recorded
```

That's the system. The rest of this page is what's built, how far along it is, and where to look next.

---

## What's here

Three repos, one idea.

- [guest-room The runtime that scopes an agent You hand it a named bundle of permissions. Permissions can be narrowed after that, never widened, and anything outside the bundle fails closed. Its behavior specs run as tests against the engine, so the docs can't drift from the code. Read guest-room ↗](https://github.com/bounded-systems/guest-room)
- [claude-box Claude Code running inside that scope The agent never holds a credential. A separate daemon holds it, performs the one permitted action, and hands back only the result. Read claude-box ↗](https://github.com/bounded-systems/claude-box)
- [prx The pipeline Point it at an issue ticket and it drives a scoped agent through to a merged PR, with each step attributed to a signed owner. Read prx ↗](https://github.com/bounded-systems/prx)

Try it

```
git clone https://github.com/bounded-systems/guest-room
# the specs that grade the claims below
cd guest-room && npm test
```

## Status, graded

Every claim I make about this system is graded against the running code and published as a signed list ([claims.jsonld](/claims.jsonld)). Three grades:

Enforced

CI proves it on every commit.

Docs generate from source and fail the build on drift. guest-room's specs execute against the engine.

Partial

Works, with a named gap.

Git writes carry signed provenance — tested end to end, but opt-in today. The agent runs credential-free, but isolation is a container plus process discipline, not yet a hardened sandbox.

Aspirational

The bet, not yet the result.

prx and claude-box converging onto guest-room as one runtime. Contracts staying honest between components as they evolve — the open problem this whole project aims at.

## If you want to go deeper

### Verify this site yourself.

Each deploy is keyless-signed and recorded in a public log — [provenance.json](/provenance.json), [Rekor](https://docs.sigstore.dev/rekor/overview/), and [this build's entry](/rekor). That proves who built it and that it's intact. It does not prove the build was authorized — authorization is the other axis, and it's what the checkpoint above exists for. More: [provenance is not legitimacy](blog/provenance-is-not-legitimacy.html).

### The package map.

Every capability is a typed node; the graph is generated from the packages and fails CI on drift — [/map](/map).

### Writing.

[Trust lives outside the page](blog/trust-lives-outside-the-page.html).

## Who

I'm Bobby DeLanghe — Brooklyn, NY. I build agent infrastructure and capability-security systems.

**Bounded Systems** is where I work that out in public, solo: every claim on this page graded against the code behind it.

If your team is chewing on the same problem, I'd like to talk:

[hello@bounded.tools (opens your email app)](mailto:hello@bounded.tools) [robertdelanghe.dev ↗ (external site)](https://robertdelanghe.dev) [github.com/bounded-systems ↗ (external site)](https://github.com/bounded-systems)
