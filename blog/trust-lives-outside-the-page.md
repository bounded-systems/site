# Trust lives outside the page

A badge a page renders is a claim the page controls. A verifier a page ships is *also* a claim the page controls — if the bytes can lie, the script that checks them can lie too. So the honest question is not "how do I verify inside the page," but "what can the page *not* forge."

This is the sequel to [provenance is not legitimacy](/blog/provenance-is-not-legitimacy). That post drew the line between *who built it* and *was the build authorized*. This one is about a smaller, sharper trap — and where it bottoms out.

## The turtles problem

Say you add a "verify this site" button: JavaScript that fetches the signed manifest, re-hashes the page, and shows a green check. Useful as a demo. Useless as trust. A tampered page swaps the bytes *and* the verifier, and the check goes green anyway. The page is grading its own homework.

The reflex fix is Subresource Integrity plus a provenance-backed CDN: load the verifier from a third party, pin it by hash, and now the page can't swap *the validator*. That genuinely helps — it shrinks the trusted surface from "arbitrary inline script" to "this one pinned, auditable artifact." But it doesn't escape the trap, because the page still chooses which script to load and which hash to pin. A malicious page pins its own. SRI only checks the bytes match the hash *you* declared; it doesn't make the page trustworthy for declaring it.

It's turtles: the validator only runs because the page chose to load it — and chose its hash.

## Where it bottoms out

The regress only ends with a checker the page has no say over:

- **The CLI you run yourself** — `cosign verify-blob` against the published bundle, then `sha256sum -c`. The page can't reach into your shell.
- **A browser extension you installed** — verifies regardless of page script, because *you* chose it.
- **A third-party monitor** watching the log on your behalf.
- **In CI: admission control** (`policy-controller`) that refuses anything not signed by an allowed identity — outside any single artifact's say-so.

In-page JavaScript is teaching and UX. Trust is something the visitor brings from outside.

## What the page can't forge

There is one thing a page genuinely can't fake: an entry in a public transparency log it doesn't run. So instead of verifying *in* the page, **point out of it.** Builds here ship a `/rekor` link to *this version's* actual entry on `search.sigstore.dev`. Follow it and you land on infrastructure we don't control, showing the certificate identity and the artifact digest. If we lied about which entry, the digest there wouldn't match the one we serve — so the lie is detectable, not hidden. The link is a claim; the destination is the check.

## A log nobody watches proves nothing

Here is the part that took us a while to internalize. Sigstore's [security model](https://docs.sigstore.dev/about/security/) is blunt about it:

> users are responsible for monitoring the log for unauthorized certificates issued to their identities … if no third parties monitor the logs, then any misbehaviour might go undetected.

Signing and logging are the easy 80%. The transparency log's whole value is that it can be *watched* — and watching is the publisher's job, not Sigstore's. An unwatched entry is a receipt nobody reads.

This is not hypothetical. The supply-chain worm from earlier this year minted its own OIDC token at runtime and produced provenance that passed the standard checks — green badge, real CI identity, genuine Rekor entry — while stealing credentials. What flagged it was monitoring: someone watching the log for an identity showing up where it shouldn't. So we now run that watch. A scheduled job follows the public log for our build identities and opens an issue the moment a certificate is minted for us that we didn't trigger.

## The ladder, complete

- **Reproducible** (Nix) — the deployed bytes are a function of public source.
- **Identity** (keyless OIDC + Sigstore) — *who* built it, no stored key.
- **Registry** (Rekor) — an immutable, public, per-version record of those proofs.
- **Monitoring** (rekor-monitor) — because a record nobody watches is not a control.
- **The ceiling** — none of it proves the build was *authorized*. Identity and integrity, not legitimacy.

Each rung proves a different thing, and naming what each one does *not* prove is the point — not a disclaimer bolted on at the end. State what the mechanism shows, name what it can't, and put the trust where the page can't reach.

*The verifier you can run yourself is [`verify-site`](https://github.com/bounded-systems/site/blob/main/vendor/conformance-kit/integrity/verify-site.mjs); this build's log entry is one click away at [/rekor](/rekor). Neither asks you to trust this page.*
