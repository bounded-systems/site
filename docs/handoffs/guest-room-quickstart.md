# Handoff: add a copy-pasteable Quickstart to guest-room

**Status:** open · **Target repo:** `bounded-systems/guest-room` · **Source:** user-testing of `bounded.tools` (site branch `claude/website-messaging-ux-gu23c8`)

## Why this exists

Feedback on the homepage: *"it's not even clear how to install this and get
started."* The site now has a **Get started** section, but it can only link
Quickstarts that actually exist upstream:

- `prx` — has one (`brew` / `nix run`). ✅ linked.
- `claude-box` — has one (`nix run .#setup` → `claude-box --room dev`). ✅ linked.
- `guest-room` — **no copy-pasteable Quickstart**, so the site can only link the
  repo generically. ❌

`guest-room` is "the model" repo — the door runtime prx is moving onto — so it's
the one a curious reader most wants to *run* after reading the model section.

## Change

Add a top-level **Quickstart** to the guest-room README: the shortest path from
clone to seeing a room expand into doors and a denied door fail closed. Mirror
the shape of the claude-box / prx quickstarts (a couple of commands, copy-paste).
If the engine is library-first rather than a CLI, a minimal runnable snippet
(`expandRoom` → `attenuate` → a denied-door example) is the equivalent.

## Acceptance / verify

Once it exists, add it to the site's `#start` section as a third card and link it
the way prx and claude-box are linked. Until then the site links guest-room only
from the **The code** section, not from **Get started** — on purpose, so the page
never points "Get started" at a repo with no start.

## Context

- Site "Get started" section: `index.html` (this site branch), `#start`.
- The two upstream quickstarts the site already trusts and links verbatim:
  - claude-box: `nix run .#setup`, then `DOORS_TCP=1 claude-box --room dev --repo .`
  - prx: `brew tap bounded-systems/prx … && brew install prx`

## Ready to apply (paste-ready)

guest-room is a TypeScript library whose Gherkin specs run against the engine
(`bun test`), so the shortest honest Quickstart is "clone, install, watch the
specs execute," plus a minimal library snippet. Paste this as a top-level
**Quickstart** section in the guest-room README.

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

Once this lands, add guest-room to the site's "Start here" / Get-started surface
the way prx and claude-box are linked.
