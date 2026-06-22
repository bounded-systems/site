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
