<!-- Grade ledger — Bounded Systems
     /ledger — projected from the built page by scripts/gen-markdown.mjs.
     Do not edit: change the page (or its generator) and rebuild. -->

[← bounded.tools](/)

# Grade ledger

Claims on this site carry a grade. This page records every time one **moved** — a grade changing, or a gap narrowing — and what changed our mind. It is rendered at **build time** from [`ledger.jsonl`](https://github.com/bounded-systems/site/blob/main/integrity/claims/ledger.jsonl), the same append-only record the build gate reads: if a grade moves and no entry records it, the build fails. So this is not a changelog someone remembers to write — it is the file that makes forgetting impossible. The raw record is at [`/ledger.jsonl`](/ledger.jsonl).

**0** — movements

**6** — claims tracked

**6** — entries

**No movement yet.** Every claim below is at the grade it held when this ledger opened — nothing has changed since. The page fills in when a grade first moves, and the gate is what guarantees that entry exists.

## Starting positions

**2026-08-20 c6 genesis aspirational** — Genesis — state at ledger open. Inter-contract enforcement is the open problem the project is aimed at.

**2026-08-20 c5 genesis aspirational** — Genesis — state at ledger open. Convergence onto one door runtime is direction, not result. No page cites c5 yet.

**2026-08-20 c4 genesis partial** — Genesis — state at ledger open. Broker holds the credential; the macOS door is TCP loopback, weaker than unix-socket possession.

**2026-08-20 c3 genesis partial** — Genesis — state at ledger open. Provenance derivation exists; emission and enforcement stay opt-in until Sigstore lands.

**2026-08-20 c2 genesis enforced** — Genesis — state at ledger open. guest-room's behaviour specs execute against the engine.

**2026-08-20 c1 genesis enforced** — Genesis — state at ledger open. Docs generate from source and fail CI on drift.

## What a genesis entry is

A genesis entry records the grade a claim held when this ledger opened. It is a starting position, not a movement, so it is marked apart from real transitions rather than padding the count — the page would otherwise imply activity that never happened.
