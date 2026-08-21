<!-- Bounded Systems — a checkpoint in front of your coding agent
     / — projected from the built page by scripts/gen-markdown.mjs.
     Do not edit: change the page (or its generator) and rebuild. -->

Bounded Systems

# Your coding agent runs with your access. Bounded Systems puts a checkpoint in front of it.

Give an agent a real task and it can touch anything you can — files, git, the network. Here, privileged actions go through one gate instead. The gate checks who is asking and what they're allowed to do, then acts or refuses. A refusal actually stops the action; either way, it's recorded.

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

- [guest-room The runtime that scopes an agent You hand it a named bundle of permissions. Permissions can be narrowed after that, never widened, and anything outside the bundle fails closed. Its behavior specs run as tests against the engine, so the docs can't drift from the code. Read guest-room ↗︎](https://github.com/bounded-systems/guest-room)
- [claude-box Claude Code running inside that scope The agent never holds a credential. A separate daemon holds it, performs the one permitted action, and hands back only the result. Read claude-box ↗︎](https://github.com/bounded-systems/claude-box)
- [prx The pipeline Point it at an issue ticket and it drives a scoped agent through to a merged PR, with each step attributed to a signed owner. Read prx ↗︎](https://github.com/bounded-systems/prx)

Try it

```
git clone https://github.com/bounded-systems/guest-room
# the specs that grade the claims below
cd guest-room && npm test
```

## Status, graded

Every claim in the registry below is graded against the running code and published as a signed list ([claims.jsonld](/claims.jsonld)). Three grades:

Enforced

A check proves it, and the build fails without it.

- **c1** — Docs generate from source and fail CI on drift. [gen-blog.mjs ↗︎ (evidence, external site)](https://github.com/bounded-systems/site/blob/32d10d589af6e6e416c49147163bb7b8c2f36448/scripts/gen-blog.mjs)
- **c2** — guest-room's behaviour specs execute against the engine. [guest-room.test.ts ↗︎ (evidence, external site)](https://github.com/bounded-systems/guest-room/blob/8473bdfd95ee3357603da8bad26ab0b876d8d61c/guest-room.test.ts)
- **legibility** — The landing page passes the legibility gate. [check.mjs ↗︎ (evidence, external site)](https://github.com/bounded-systems/site/blob/main/scripts/legibility/check.mjs)
  
  **Gap** — The gate measures budgets and banned words, so it can show the page did not regress. It cannot show the page lands: the cold-read scenarios are judged by a model on demand (npm run coldread), by hand and never in the build. That judge is Opus — a ceiling test, so a red run is strong evidence and a green one is weak. The comprehension test itself is one outside human and is not automated.

Partial

Works, with a named gap.

- **c3** — A git-write carries a verifiable [in-toto](https://in-toto.io) / [SLSA](https://slsa.dev) provenance derivation — signed per-actor, content-addressed in a derivation ledger, checked fail-closed at the merge gate. [slsa.ts ↗︎ (evidence, external site)](https://github.com/bounded-systems/ocap-provenance/blob/9b5139de0b0d89a0908b67e6ca22a6eb697ce3df/slsa.ts)
  
  **Gap** — Emission and enforcement are opt-in (a signer plus require-signed) until [Sigstore](https://sigstore.dev) lands; without them the push is bare. Verified mechanisms: ocap-provenance/slsa.ts, prx verify.ts/merge-guard.ts, anchored-chain.
- **c4** — The agent never holds the credential — a broker daemon does. [daemon.ts ↗︎ (evidence, external site)](https://github.com/bounded-systems/prx/blob/d1b6030eebd2caffaf22377d21c24c4c6f2c77c1/packages/prx/src/keeperd/daemon.ts)
  
  **Gap** — On macOS the door is TCP loopback — weaker than unix-socket possession; isolation is the container plus daemon discipline, not a hardened sandbox. Verified: keeperd/daemon.ts holds the key; claude-box is credential-free.

Aspirational

The bet, not yet the result.

- **c5** — prx and claude-box converge onto one guest-room door runtime. [prx ↗︎ (evidence, external site)](https://github.com/bounded-systems/prx)
  
  **Gap** — Convergence is in progress — prx wires the seams in-process today; the out-of-process door runtime is the direction, not yet at scale.
- **c6** — Contracts stay honest between components as they evolve. [prx ↗︎ (evidence, external site)](https://github.com/bounded-systems/prx)
  
  **Gap** — Inter-contract enforcement is the open problem this whole project is aimed at — a bet, stated as direction, not a solved result.

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

[hello@bounded.tools (opens your email app)](mailto:hello@bounded.tools) [robertdelanghe.dev ↗︎ (external site)](https://robertdelanghe.dev) [github.com/bounded-systems ↗︎ (external site)](https://github.com/bounded-systems)
