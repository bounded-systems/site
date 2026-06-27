# Provenance is not legitimacy

A signed build tells you who produced an artifact and that the bytes are intact. It does not tell you the build was meant to happen. That gap is small, easy to oversell, and the entire point.

This site now signs its own stylesheet on every deploy. The badge in the proof section is the result, and it is scoped on purpose: it says *produced by this identity*, never *verified safe*. Here is the ladder it sits on, and the ceiling it stops at.

## The ladder

Three rungs, each proving a different thing, none of them the next.

**Reproducible — matches public source.** The build is a Nix derivation: `nodejs` and the brand are pinned by `flake.lock`, so `nix build .#site` yields the same `dist/` on any machine. That proves the deployed bytes are a pure function of source anyone can read. It says nothing about who ran the build.

**Identity — who built it, keyless.** In CI, the GitHub Actions OIDC token authenticates to Fulcio, which mints a signing certificate bound to the repository, workflow, and commit. The token is consumed at build time and gone; the certificate lives for one build and expires. There is no key to store, leak, or rotate. What survives is the attestation: *this asset was signed by this identity*.

```
agent/CI → OIDC token → Fulcio → one-build cert → cosign sign-blob → Rekor entry
```

**Registry — the immutable, monitorable record.** The signature and its inclusion proof land in **Rekor**, the public append-only transparency log. Every signed version is one entry, keyed to the artifact digest, queryable by anyone. We do not build a registry — Rekor *is* the per-version registry, and we push to it directly with `cosign sign-blob`. The badge links the entry; `/provenance.json` carries the pointer.

That is the whole pipeline: reproducible proves *matches public source*; OIDC plus Sigstore proves *who built it*; Rekor is the *immutable per-version record* of those proofs.

## The ceiling

None of it proves the build was *authorized*.

A recent supply-chain worm made this concrete. It mints an OIDC token at runtime, submits it to Fulcio, and the provenance it produces passes every standard check: the badge is green, the certificate subject is a real CI identity, the Rekor entry is genuine — and the package still steals credentials. Provenance proved the package was built in a particular CI environment. It never proved the build should have happened.

So the honest reading of any green badge is narrow. It attests identity and integrity. It does not attest intent. A log entry is not trust by itself, either: the strength of a transparency log is not that it blocks bad entries, but that it makes them *monitorable*. The security shows up only when someone watches the log for their own identity appearing when they did not publish — which is, notably, one of the few controls that actually caught the worm.

## What this site claims, graded

- **Enforced** — the stylesheet is keyless-signed on every deploy, and the Rekor entry is public. `cosign verify-blob` against the published bundle confirms identity and integrity. If signing breaks, the deploy step fails.
- **Partial** — the badge is a claim *we* render, and your browser does nothing with it. Trust comes from you checking the log, not from the badge existing. The verify recipe is right there so you can; most visitors will not.
- **Not claimed** — that the build is safe or authorized. There is no native way for a *page* to prove its own legitimacy to a visitor, and identity is not legitimacy. We do not pretend otherwise.

## Why it stops at one asset

The reflex here is to grow it: sign every file, stand up an OCI registry of versioned site artifacts, add a key-management layer "for completeness." Each step feels like rigor and is mostly surface area. One signed asset carries the whole argument — reproducible, identified, logged, and honestly capped. The moment the exhibit sprouts a second signed artifact for its own sake, that is the reflex talking, not the goal.

The people who oversell the green badge are the foil. The careful claim — *provenance, not legitimacy* — is the differentiator, and it is the same instrument-versus-finding discipline this whole project runs on: state what the mechanism proves, name what it does not, and grade it against the running code.

*The signing pipeline lives in [`deploy.yml`](https://github.com/bounded-systems/site/blob/main/.github/workflows/deploy.yml); the per-deploy record is at [/provenance.json](https://bounded.tools/provenance.json). Both are graded against the code that backs them.*
