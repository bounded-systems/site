<!-- Map — Bounded Systems
     /map — projected from the built page by scripts/gen-markdown.mjs.
     Do not edit: change the page (or its generator) and rebuild. -->

[← bounded.tools](/)

# Map

Everything we've built, laid out by what it is. **Verbs act** — they are the only places an agent can touch the world. **Nouns hold** — the data those actions run on. Each entry below is generated from the package's own declared labels, so this page can't drift from the code; when it looks wrong, the code is wrong.

**26** — packages mapped

**72** — repos in the org

**19** — verbs (act)

**7** — nouns (hold)

Coverage is honest, not complete: these are the published packages that declare their own labels. The rest of the org's repos appear here as their descriptors land.

## Verbs — the things that act

Every one of these is a sanctioned access point: the single place a kind of effect is allowed to happen.

auth door capability auth

Service-credential resolver (GitHub, Notion) through a single sanctioned access point

uses → env

bd door client beads/tasks

Typed interface to the beads CLI with policy enforcement and short-ID guards

uses → env, policy, proc

**door-kit door client door/protocol** — In-box door-client SDK for claude-box's capability doors, over the guest-room protocol

**env door capability-seam environment/config** — The one sanctioned reader of process.env, routing ambient config through capability imports

**fs door capability-seam filesystem** — Filesystem capability seam; the one allowed filesystem-access point with an injectable FileSystem

gh door client github

GitHub CLI wrapper with policy enforcement, rate-limit gating, and budget audit logging

uses → env, github-budget, policy, proc

git door capability-seam git

Git CLI wrapper with policy enforcement and stale-lock recovery

uses → env, fs, policy, proc

github-budget door governor github/rate-limit

Rate-limit-aware gh wrapper with bucket classification, pre-call gating, and audit trail

uses → audit-context, env, proc

host door capability-seam host-info

The one sanctioned reader of host/OS ambient state (home dir, temp dir, hostname), routing ambient authority through capability imports

uses → env

proc door capability-seam process/spawn

The one allowed subprocess spawn point, routing external-tool invocations through a capability

uses → env, policy

repo-root door resolver repo/fs

Repo-root resolution capability: lazy git-based runtime root plus the eager .git-marker walk for build/codegen, the one sanctioned root-resolution point

uses → proc

scout door reader external-read

Content-addressed surface reads (file/grep/files) with anchored-chain provenance

uses → anchored-chain, anchored-chain-sqlite, cas

slack door reader slack/external

Policy-gated, provenance-tracked Slack read surface: bounded read ops behind a swappable transport port, with keymaker-minted scoped credentials

uses → anchored-chain, anchored-chain-sqlite, cas, policy

**guest-room room runtime capability/model** — Guest-agnostic room+door capability runtime — the core library claude-box is built on

**policy room engine tool-policy/authz** — Tool-policy engine enforcing subcommand allowlists by tool, state, and role

surface-sync room transform surfaces

Type ontology for work-unit change-detection across GH/branch/worktree/tmux/beads

uses → disposition

**disposition guest classifier work-unit/state** — Pure classifier mapping work-unit surface state to a disposition (ok/prune/repair/review)

**schema-gen guest generator schema/types** — Project zod schemas to explicit, fast-types-clean TypeScript (zod → JSON Schema → .d.ts)

**verbspec guest projection-engine interface/cli** — Spec-driven CLI core: author a verb once as a typed VerbSpec, project it to CLI, MCP, OpenAPI, and Anthropic tool surfaces

## Nouns — the things that hold

The data the verbs run on: storage, schemas, chains, context.

anchored-chain room data-structure provenance

Derivation chain with contract validation, signing, lineage tracking, and invalidation

uses → cas

anchored-chain-sqlite room store-impl provenance/persistence

SQLite/Drizzle-backed implementation of the anchored-chain stores

uses → anchored-chain, cas

**audit-context room context audit/attribution** — Ambient runtime context for gh-call audit attribution (verb, actor, truth reason)

**cas room substrate content-addressing** — Content-addressable storage substrate: bytes addressed by their SHA-256 digest, with a storage-agnostic blob-store port

**machine-schema room schema state-machine/types** — Brands, handoff envelope, and state/phase/invariant primitives for work-unit machines

**ocap-provenance room contract provenance** — Capability-use provenance: a schema + SLSA mapping binding each privileged effect to a signed owner + auditable chain

**prx-config guest config-schema tui-config** — TUI configuration schema parser/emitter for L1 Claude and L2 Warp tools

## The capability seams

One narrow seam per kind of ambient system power — the single sanctioned access point in prx today, each one a door on the guest-room runtime tomorrow — so effects stay attributable and policy stays enforceable.

**fs** — the one filesystem door

**proc** — the one subprocess spawn

**env** — the one reader of process.env

**gh** — GitHub CLI, policy-gated

**git** — git CLI, lock-recovering

**cas** — bytes addressed by digest

Contract state between repos lives on [/contracts](/contracts); how honestly the claims hold up, on [/ledger](/ledger). The full source is at [github.com/bounded-systems](https://github.com/bounded-systems).
