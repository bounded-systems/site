# Decision doc: which verifier, and on what foundation

A page that checks its own provenance is structurally limited. The page chooses
what to fetch and what to display, so it can always lie about the result. That is
not a flaw to engineer around — it is the trust boundary. A self-check is
meaningful only to a *third party* running it against a page, or to a *first load*
a visitor hasn't yet learned to distrust. State that up front so nothing here
oversells.

## The fork: two verifiers, two designs

They diverge completely and can't share a spec.

| | **A. Page-embedded self-check** | **B. Third-party URL checker** |
|---|---|---|
| Input | none — runs inside the served page | a URL (or OCI ref) you hand it |
| Ships | inline in `index.html` | CLI / browser extension / CI step, installed by *you* |
| Proves to | nobody about itself (turtles); a 3rd party or first-load only | the operator running it — real trust |
| Today | — | `integrity/verify-site.mjs` |

**Recommendation: B is the real verifier; A is at most a labeled teaching demo.**
Trust lives where the page can't reach (the blog post's thesis). Invest in B —
the URL-in checker that pulls the **signed OCI artifact** (exact bytes, edge-independent),
verifies its Sigstore bundle, and reports identity + freshness. Keep A, if at all,
to a readout that does *not* re-hash live HTML (see caveat 4) — "this manifest is
the one signed & logged, by identity X, at time T" — never a green "verified" badge.

## Four load-bearing caveats

1. **Self-check turtles.** A page verifying itself proves nothing to its own
   visitor. Useful only third-party or first-load.
2. **Hash match ≠ trust.** It proves "this artifact was signed by identity X via
   workflow Y." Whether X and Y are *trustworthy* is the operator's judgment, not
   the tool's. (This is the authentication-vs-authorization seam again.)
3. **Rekor v2 removed search.** v2 has no get-by-leaf-hash and no get-by-log-index;
   the search-by-hash flow is v1-only, and v1 is in maintenance. So **do not build
   on the Rekor query API.** Build on the published **Sigstore bundle**
   (`site.sha256.sigstore.json`) — it already carries the inclusion proof, the
   signed entry, and the Fulcio cert. Verifying the bundle is offline and survives
   v2; querying Rekor by index is a convenience link for humans (`/rekor`), not a
   foundation for machines.
4. **The edge mutates HTML (measured, 2026-06-27).** Cloudflare injects a ~919-char
   bot-detection beacon (`__CF$cv$params` / `cdn-cgi/challenge-platform`) into every
   HTML response. So **re-hashing live-served HTML against the signed manifest fails
   on a perfectly legitimate deploy** — confirmed: stripping that one script makes
   every HTML file hash match the manifest exactly; non-HTML assets already match.
   Consequence: any "re-hash every served file" check (including `verify-site` in
   live-URL mode) is wrong for HTML. The honest fixes, in order of preference:
   (a) verify the **OCI artifact**, not the edge — exact signed bytes, no edge in
   the path; (b) turn off Cloudflare's JS-detection injection so the edge serves
   bytes verbatim (a zone setting — needs dashboard/API access); (c) if checking
   the live edge, strip the *known* beacon and disclose it, treating HTML as
   "signed-bytes + a named, benign edge transform." Never silently pass or silently
   fail.

## Why `.mjs` today — and what B should be

`verify-site.mjs` is zero-dependency Node `.mjs` on purpose: the site build is
already Node (`build.mjs`, the brand tools), so `node verify-site.mjs <url>` runs
with **no install, no compile, no toolchain** — the lowest bar for "anyone can run
this," and it publishes cleanly to npm with Sigstore provenance (SRI-pinnable). For
a script that does `fetch` + `sha256` + JSON, that was the expedient, honest choice.

It is *not* the right choice for B once B does real bundle verification (Merkle
inclusion against a checkpoint, cert chain to the Fulcio root):

- **TypeScript + `sigstore-js`** — the reference JS implementation of exactly the
  bundle verification we need; types catch the bundle/cert shape. Natural for both
  a Node CLI and a browser extension. **Most likely target for B.**
- **Deno** — runs TS directly, Web-standard `crypto`/`fetch`, can execute from a
  URL; already our runtime for the `lone` semantic gate on bd-site. Good if we want
  zero-build distribution.
- **Rust + `sigstore-rs`** — best if B should be a single static binary or needs to
  be fast/embeddable; heavier build + distribution, overkill for today's surface.

So: `.mjs` = the dependency-free expedient that matches the current build; **B's
standalone verifier should move to TS/`sigstore-js` (or Deno)**, verifying the
bundle offline rather than querying Rekor. Rust only if a single binary becomes a
goal.

## What's blocked on this decision

The standalone CDN-module checker (URL in → bytes → bundle verify → identity +
inclusion) is design **B**. Its module spec — fetch, in-browser SHA-256, bundle
verification, cert SAN/OID inspection, display — can't be written until B-vs-A and
the bundle-not-query-API foundation are confirmed. This doc is that gate.
