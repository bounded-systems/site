<!-- Bounded Systems — bounded authority for AI agents
     / — projected from the built page by scripts/gen-markdown.mjs.
     Do not edit: change the page (or its generator) and rebuild. -->

Bounded Systems

# Your coding agent wanders. Keep it inside the job you gave it.

Give an AI agent a real task and it reaches past it — touching files you didn't mean to expose, running commands you didn't intend. Today it does that with your access. Bounded Systems scopes that down. Each kind of system power — git, the shell, your tools — gets one sanctioned access point. That point checks your policy, acts or refuses, and records what happened. It's a well-known security idea: one checkpoint in front of everything the agent can do.

```
agent → execGit({ subcommand: "push", role: "keeper" })
  ✓ pushed · keeper holds git-write · signed · audited

agent → execGit({ subcommand: "push", role: "scout" })
  ✗ refused · scout holds no git-write · recorded
```

**[Read the bet ↓](#bet)** — [guest-room on GitHub ↗ (external site)](https://github.com/bounded-systems/guest-room)

Built in the open. Every claim on this page is graded against the running code.

![A guest passes through one door into a room.](brand/mark/mark-white.svg)

room · door · guest

- guest = your agent
- door = one capability
- room = the doors it holds

01 / The bet

## The bet

Good software splits into parts. Each good idea becomes its own piece with clear edges and a defined contract — a promise about what it does. Those clear edges are also what let you scope an agent to one piece.

An agent can author one of those abstractions cheaply now. What nobody has solved yet is keeping many of them honest as they evolve — enforcing contracts between ideas, not just within one.

Most tooling secures a single action. The unsolved work lives in the seams between them. Bounded Systems works there: effects are tied to a signed owner, one source of truth projects to many surfaces, and drift is caught as a build failure. Contracts can't quietly rot.

This claim, graded: Aspirational Inter-contract enforcement is the open problem — stated as a bet, not a solved result.

02 / The model

## The model, in running code

Bounded Systems leans on a single mechanism. For each kind of system power, there is one sanctioned way through. We call it a **capability seam**: a **door** you hold a socket to, never the keys behind it. The guest-room runtime makes that concrete.

**room** — a named bundle of doors for one kind of stay. Ask for a room it doesn't know and it fails closed — a typo never widens authority.

**door** — one unit of authority — a unix socket to a broker daemon that holds the real keys. The guest can knock; it cannot do.

**guest** — the agent the room hosts — for example claude-box, the Claude Code runtime. The engine names no guest.

```
# a room expands to exactly the doors this stay holds
const doors = expandRoom(rooms, catalog, "dev", env);

// attenuate appends caveats; authority only narrows, never widens
const narrowed = attenuate(doors[0], ["host=github.com"]);

// list the doors this room denies, so the agent won't attempt them
deniedDoorSection(deniedDoors(catalog, held)) → "do not attempt"
```

Today prx wires these seams in-process, as library imports. The move is onto guest-room's out-of-process doors — same model, enforced across a socket — with claude-box as the first guest. Both are being broken onto that shared runtime: two tools today, converging into one door-based system. Their shared contracts are lifted into standalone interfaces: guest-room (the room/door contract), ocap-provenance (the signed predicate), and the wire schemas. Each piece composes against a published boundary, never another's internals.

Concretely: a room is a rootless Podman container, built reproducibly by nix. A door is a single unix socket bind-mounted in, with a broker daemon holding the authority on the other side. Walls that come standard — drop-all-caps, read-only, no-new-privileges — and a short list of doors.

Other agent harnesses make the work cheaper or the output leaner. This one makes it accountable — the authority layer, designed to run alongside the rest.

03 / Kept honest

## Every claim here is graded against the running code.

An instrument built to catch my own over-statements and file the gap. Docs generate from source and fail CI on drift; guest-room's specs execute against its engine. I keep myself as honest as I keep the agents.

Beyond the hand-graded claims, the build runs a battery of fail-closed gates. [lone](https://github.com/bounded-systems/lone) blesses each page's DOM for semantic HTML and accessibility. The [JSON-LD](https://json-ld.org) is checked against [SHACL](https://www.w3.org/TR/shacl/) shapes, an [SPDX](https://spdx.dev) [SBOM](https://www.cisa.gov/sbom) is generated and completeness-checked, and the [nix](https://nixos.org) build is reproducible. A signed whole-site manifest and [RFC 9530](https://www.rfc-editor.org/rfc/rfc9530) content digests cover the served bytes. Each verdict folds into one honest [conformance projection](/conformance) — lone's web-build model. It emits the strong [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/) 2.2 AA / [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) claim only when every criterion passes. Manual and unsupplied criteria stay not assessed, never overclaimed. The hand-graded claims above are published as a signed graph — [claims.jsonld](/claims.jsonld) — each with its grade, its gap, and the evidence link.

**Enforced** — A test, a signature, or a CI gate proves it on every commit. If it breaks, the build breaks.

**Partial** — True in the common path, with a named gap. The gap is written down, not glossed over.

**Aspirational** — The bet, not yet the result. Stated as direction so it can't masquerade as done.

**Enforced** — Docs generate from source and fail CI on drift.

**Enforced** — guest-room's behaviour specs execute against the engine.

**Partial** — A git-write carries a verifiable in-toto / SLSA provenance derivation — signed per-actor, content-addressed in a derivation ledger, checked fail-closed at the merge gate. — the sign→verify loop is tested but opt-in today; gh, external reads, and egress are policy-gated, not yet signed.

**Partial** — The agent never holds the credential — a broker daemon does. — claude-box runs credential-free; keeperd / netd hold the secret and hand back only the result. Isolation today is the container plus in-process discipline, not yet a hardened sandbox.

**Aspirational** — prx and claude-box converge onto one guest-room door runtime. — guest-room v0 ships the model (rooms, doors, attenuation, confinement); prx still runs a parallel in-process door stack. Converging the two — and signing across every door — is the work in progress.

**Aspirational** — Contracts stay honest between components as they evolve. — the unsolved problem this whole project is aimed at.

04 / The proof

## The proof is the code

- [guest-room Flagship The library that scopes what an agent can do A guest-agnostic capability runtime: rooms, doors, append-only attenuation, lease-bound confinement. Its Gherkin specs execute against the engine, so the docs cannot drift from the code. The model everything else is built on. Read guest-room ↗](https://github.com/bounded-systems/guest-room)
- [prx At scale The CLI that runs agent tasks at scale guest-room's model run at full scale: capability-scoped agents driving each work unit through one signed, content-addressed pipeline to a merged PR. Git-writes are signed and verified against the keeper; the other seams are wired in-process as imports today. Read prx ↗](https://github.com/bounded-systems/prx)
- [claude-box The guest Claude Code, scoped to one room The first guest: a Claude Code runtime whose authority is the door references it holds — keeper, scout, concierge, net — and nothing beyond them. Everything else is denied and recorded. Read claude-box ↗](https://github.com/bounded-systems/claude-box)

**Start here** — guest-room — the model you can run

Your first move: clone the runtime, then watch its behaviour specs execute against the engine — the same specs that grade the claims above.

```
# clone the door runtime
git clone https://github.com/bounded-systems/guest-room
# …then run the specs that grade the claims above
cd guest-room && npm test
```

Rather not clone? [Download the latest release ↗](https://github.com/bounded-systems/guest-room/releases/latest) · [browse on GitHub ↗](https://github.com/bounded-systems/guest-room)

### Provenance you can open

[in-toto](https://in-toto.io) · [SLSA](https://slsa.dev) · [DSSE](https://github.com/secure-systems-lab/dsse)

Git-writes carry a signed in-toto / SLSA derivation — a per-actor [ed25519](https://ed25519.cr.yp.to) signature over content-addressed inputs and outputs, recorded in a derivation ledger. Open one:

**▸ ▸ a signed derivation (real output)** *(collapsed on the page)*

```
// DSSE envelope · payloadType application/vnd.in-toto+json
{ "derivationId": "sha256:0269b9…",
  "inputs":  { "copy":  "sha256:08eaa3…" },
  "outputs": { "audit": "sha256:0031d9…" },
  "signatures": [{ "keyid": "05ea15…", "sig": "EGClgX…" }] }
```

Backed by [cas](https://github.com/bounded-systems/cas) (content addressing) and [anchored-chain](https://github.com/bounded-systems/anchored-chain) (signed derivations); [string-audit](https://github.com/bounded-systems/string-audit) emits one per audit.

### This whole site proves its own build

[Sigstore](https://sigstore.dev) · [OIDC](https://openid.net/connect/) · [Rekor](https://docs.sigstore.dev/rekor/overview/) · [GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

At deploy time, the whole site is keyless-signed as a manifest. The built site is also pushed to GHCR as a signed, pullable [OCI](https://opencontainers.org) artifact. GitHub Actions' OIDC identity authenticates to [Fulcio](https://docs.sigstore.dev/fulcio/overview/). Fulcio mints a one-build certificate that then expires. Both signatures land in the public Rekor log. No stored key. This attests origin, not authority: it proves who built it and that it is intact. It does not prove the build was authorized or safe.

Authority is the other axis — what the running agent is permitted to do, the thing provenance is silent on. It is bounded separately. One capability seam per kind of ambient power. Tokens that only narrow, never widen. An explicit deny set. Egress gated through brokers, enforced at the boundary.

**▸ ▸ verify the whole site yourself** *(collapsed on the page)*

```
# the live provenance record (manifest digest, Rekor entries, OCI ref)
curl https://bounded.tools/provenance.json

# verify the whole-site signature, then check every live file against it
cosign verify-blob \
  --bundle site.sha256.sigstore.json \
  --certificate-identity-regexp '^https://github.com/bounded-systems/site/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  site.sha256
sha256sum -c site.sha256

# or pull the exact built bytes as a signed OCI artifact
cosign verify ghcr.io/bounded-systems/bounded-tools-site:latest --certificate-oidc-issuer https://token.actions.githubusercontent.com --certificate-identity-regexp '^https://github.com/bounded-systems/site/'
oras pull ghcr.io/bounded-systems/bounded-tools-site:latest
```

**▸ ▸ run a self-check in your browser** *(collapsed on the page)*

A demo, not proof. This script ships with the page, so a tampered page could ship a tampered checker and still go green — re-hashing only shows the page is self-consistent. The one step that reaches outside the page is the public-log check. Real verification is the [commands above](#build-provenance), `jsr:@bounded-systems/verify`, or the [Rekor entry](/rekor) you open yourself — see [trust lives outside the page](blog/trust-lives-outside-the-page.html).

Built by [deploy.yml](https://github.com/bounded-systems/site/blob/main/.github/workflows/deploy.yml) · this build's [Rekor entry](/rekor) & [digests](/provenance.json) · why this is provenance and [not legitimacy](blog/provenance-is-not-legitimacy.html).

### The capability seams

@bounded-systems/\*

One narrow seam per kind of ambient system power — the single sanctioned access point in prx today, each one a door on the guest-room runtime tomorrow — so effects stay attributable and policy stays enforceable.

**fs** — the one filesystem door

**proc** — the one subprocess spawn

**env** — the one reader of process.env

**gh** — GitHub CLI, policy-gated

**git** — git CLI, lock-recovering

**cas** — bytes addressed by digest

The libraries, as a graph

## Every capability is a typed node; the edges are how they compose.

Each `@bounded-systems/*` package says what it is — a **verb** (a capability that acts) or a **noun** (data that flows) — in its own `package.json`. This is generated from that, and fails CI on drift.

**19 verbs** — capabilities that act — the only places an agent touches the world

**7 nouns** — the data those capabilities run on

**30 edges** — declared dependencies between them

[See the whole map →](/map)

Colophon

## Built by Robert DeLanghe — in public, against running code.

I'm Bobby. I build agent infrastructure and capability-security systems.

**Bounded Systems** is where I work out, in the open, how agent-authored software stays trustworthy as it grows. A solo project — every claim on this page graded against the code that backs it.

If your team is chewing on the same problem, I'd like to talk.

[Get in touch (opens your email app)](mailto:hello@bounded.tools) [robertdelanghe.dev ↗ (external site)](https://robertdelanghe.dev) [github.com/bounded-systems ↗ (external site)](https://github.com/bounded-systems)
