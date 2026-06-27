# claims (spike)

A **machine-verifiable, signed claims graph** for the site's graded honesty
claims — the rigorous replacement for the hand-wavy "Every claim points at the
running code" prose we deleted from the provenance pages. Instead of *asserting*
that claims are backed, **emit each claim as structured data with its grade +
evidence link, sign the graph, and let a gate check it.**

> Own-repo path: this is a tenant of `integrity/` for now; like `integrity/`
> itself, it's a `git subtree split` candidate for its own `bounded-systems/claims`
> repo once the shape settles — the same "lift the shared contract into a
> standalone, versioned interface" move as `ocap-provenance` / `guest-room`.

## Shape — nanopublication, in JSON-LD

A [nanopublication](http://nanopub.org) is three named graphs, which map 1:1 onto
the honesty model (`example.jsonld`):

| nanopub graph | here |
|---|---|
| **assertion** | the graded claims — `claim`, `grade` ∈ {enforced, partial, aspirational}, `gap` (required when not enforced), `evidence` (the backing-code URL) |
| **provenance** | what the assertion was derived from (`prov:wasDerivedFrom` the repo) and when |
| **publication-info** | who it's attributed to + `securedBy` → the Sigstore bundle over this graph |

Why nanopub over the alternatives, for *this* use:
- **vs Verifiable Credentials** — VC is the right tool if the goal is interoperable,
  *issuer-attributed* credentials about a subject (credential exchange). nanopub is
  the tighter fit here because our distinguishing move is *every claim carries its
  own provenance + grade* — exactly what the three-graph structure expresses. VC's
  v2.0 content/envelope split is attractive though, and either can be secured the
  same way (below), so this stays VC-compatible.
- **vs schema.org Claim/ClaimReview** — that's fact-check journalism markup (Google
  rich results); semantically wrong for self-claims. Keep schema.org for
  `Person`/`Organization`/`BlogPosting` only.
- **RDF-star** is the mechanism for attaching the grade to a claim triple, usable
  inside this.

## Secured by the *same* envelope as the build

The claims graph is just a JSON blob, so it's secured by the keyless Sigstore
envelope we already run: `cosign sign-blob claims.jsonld` (GitHub Actions OIDC →
Fulcio → Rekor), served alongside as `claims.jsonld.sigstore.json` — the
`securedBy` pointer. The claims layer reuses the build-provenance signing infra;
one trust model across "how it was built" and "what it claims."

## The gate (structure-audit tenant)

`validate-claims.mjs` is the check, in miniature: every claim is non-empty,
graded, **gap-disclosed when not enforced**, evidence-linked to an absolute URL,
and the graph names how it's `securedBy`. This is the rigorous form of the deleted
section — `claim → evidence` becomes *checkable*, and folds into the structure-audit
gate (`integrity/structure-audit/`) as the "claims" dimension.

## The honesty caveat (unchanged)

A self-issued nanopub/VC is still a **claim you control** — the turtles problem.
This buys **structure + verifiable issuance + machine-readability**, not
legitimacy. The grade and the gap are self-asserted; trust still comes from a
reader resolving the `evidence` link to the running code, out-of-page. The win is
that the binding is now explicit, typed, signed, and gate-checked instead of a
sentence asking you to believe it.

## Status

Spike: `example.jsonld` (a real bounded.tools claims graph) + `validate-claims.mjs`
(passes; a `partial` claim that hides its gap fails). Not yet wired into either
site's build — the next step is to source the honesty-section claims from data,
emit + sign the graph at deploy, and add the gate to structure-audit.
