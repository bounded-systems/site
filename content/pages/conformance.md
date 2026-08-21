<!-- Conformance — Bounded Systems
     /conformance — projected from the built page by scripts/gen-markdown.mjs.
     Do not edit: change the page (or its generator) and rebuild. -->

[← Kept honest](index.html#honesty)

# Conformance, computed against the running build

The honesty section grades each *claim* by hand. This page does the opposite: it folds the gate verdicts this build genuinely verifies through [`lone`](https://github.com/bounded-systems/lone)'s web-build conformance model, and reports everything it cannot verify as **not assessed** — never as met. The strong WCAG 2.2 AA / OWASP ASVS claim is emitted only when every gating criterion passes, so this report can never overclaim on its own.

[machine-readable report ↗](api/v1/conformance.json) · [the signed build provenance](index.html#build-provenance)

---

## Conformance

Partial conformance: automated DOM checks clean; WCAG 2.2 AA (manual audit) not supplied; OWASP ASVS Level 2 not supplied; Core Web Vitals (p75) not supplied; Baseline Widely Available not supplied; runtime reliability not supplied.

15/37 criteria met · 1 unmet · 21 not assessed · Bounded Systems Web-Build Conformance Standard v1.0.0

### html 2/2 met

html: 2/2 met

- met
  
  HTML author requirements
  
  HTML Living Standard · author conformance
  
  lone static checks clean (no findings)
  
  [evidence](/#build-provenance)
- met
  
  Nu HTML Checker errors
  
  Nu Html Checker · zero errors
  
  0 validator errors
  
  [evidence](/#build-provenance)

### accessibility 4/6 met

accessibility: 4/6 met (2 not assessed)

- met
  
  WAI-ARIA author requirements
  
  WAI-ARIA 1.2 · author conformance
  
  lone static checks clean (no findings)
  
  [evidence](/#build-provenance)
- met
  
  WCAG 2.2 AA (automated subset)
  
  WCAG 2.2 · AA (automated subset)
  
  lone static checks clean (no findings)
  
  [evidence](/#build-provenance)
- met
  
  axe serious/critical violations
  
  axe-core · serious/critical
  
  0 serious/critical violations
  
  [evidence](/#build-provenance)
- not assessed
  
  WCAG 2.2 AA (manual audit)
  
  WCAG 2.2 · AA (manual)
  
  no manual WCAG 2.2 AA audit supplied
  
  [evidence](/#build-provenance)
- not assessed
  
  WCAG 2.2 AAA (selected)
  
  WCAG 2.2 · AAA (selected)
  
  no AAA attestation supplied (optional)
  
  [evidence](/#build-provenance)
- met
  
  Agent heuristic accessibility review
  
  ARIA/WCAG (machine heuristic) · agent heuristic (recommended)
  
  agent heuristic pass clean — 7 page(s), 0 warning(s). AGENT/STATIC HEURISTIC — NOT AT-user testing; a11y.wcag22-aa-manual stays not-assessed.
  
  [evidence](/#build-provenance)

### design 0/5 met

design: 0/5 met (5 not assessed)

- not assessed
  
  Palette contrast (design tokens)
  
  WCAG 2.2 + APCA · AA (token-level)
  
  no palette-token report supplied
  
  [evidence](/#build-provenance)
- not assessed
  
  Typography tokens
  
  WCAG 2.2 · AA (token-level)
  
  no typography-token report supplied
  
  [evidence](/#build-provenance)
- not assessed
  
  Target size (interactive tokens)
  
  WCAG 2.2 · AA (token-level)
  
  no target-size report supplied
  
  [evidence](/#build-provenance)
- not assessed
  
  Effective contrast under opacity
  
  WCAG 2.2 · AA (token-level)
  
  no opacity-contrast report supplied
  
  [evidence](/#build-provenance)
- not assessed
  
  Token likeness hygiene
  
  Design-system hygiene · recommended
  
  no token-likeness report supplied
  
  [evidence](/#build-provenance)

### security 1/3 met

security: 1/3 met (2 not assessed)

- not assessed
  
  OWASP ASVS Level 2
  
  OWASP ASVS 5.0.0 · L2
  
  no OWASP ASVS attestation supplied
  
  [evidence](/#build-provenance)
- met
  
  known critical/high vulns
  
  OWASP ASVS 5.0.0 · zero critical/high
  
  0 known critical/high vulns
  
  [evidence](/#build-provenance)
- not assessed
  
  HSTS preload
  
  RFC 6797 / hstspreload.org · preloaded
  
  no HSTS preload status supplied
  
  [evidence](/#build-provenance)

### performance 0/1 met

performance: 0/1 met (1 not assessed)

- not assessed
  
  Core Web Vitals (p75)
  
  Core Web Vitals · p75 mobile + desktop
  
  no Core Web Vitals field data supplied
  
  [evidence](/#build-provenance)

### compatibility 0/1 met

compatibility: 0/1 met (1 not assessed)

- not assessed
  
  Baseline Widely Available
  
  Baseline · Widely Available
  
  no Baseline result supplied
  
  [evidence](/#build-provenance)

### reliability 0/1 met

reliability: 0/1 met (1 not assessed)

- not assessed
  
  runtime reliability
  
  Bounded Systems reliability bar · —
  
  no runtime reliability report supplied
  
  [evidence](/#build-provenance)

### semantic 2/5 met

semantic: 2/5 met (3 not assessed)

- met
  
  JSON-LD 1.1 + SHACL conformance
  
  JSON-LD 1.1 / SHACL · conforms
  
  JSON-LD 1.1 conforms to SHACL shapes (0 violating blocks)
  
  [evidence](/#build-provenance)
- not assessed
  
  CommonMark conformance
  
  CommonMark · conforms
  
  no CommonMark report supplied
  
  [evidence](/#build-provenance)
- met
  
  AI-readability
  
  llms.txt convention · recommended
  
  llms.txt present, links resolve, Markdown siblings exposed
  
  [evidence](/llms.txt)
- not assessed
  
  OpenAPI 3.2 + JSON Schema 2020-12
  
  OpenAPI 3.2 / JSON Schema 2020-12 · conditional
  
  no OpenAPI report supplied (only applies if an API is published)
  
  [evidence](/#build-provenance)
- not assessed
  
  Atom feed (RFC 4287)
  
  RFC 4287 · recommended
  
  no feed report supplied (optional)
  
  [evidence](/#build-provenance)

### seo 1/1 met

seo: 1/1 met

- met
  
  Technical SEO
  
  Search-engine technical guidelines / RFC 9309 · clean
  
  canonical/titles/robots/sitemap clean, 0 broken internal links
  
  [evidence](/sitemap.xml)

### integrity 4/9 met

integrity: 4/9 met (5 not assessed)

- not assessed
  
  SLSA provenance + in-toto
  
  SLSA / in-toto · present + signed + verified
  
  no SLSA/in-toto provenance supplied
  
  [evidence](/#build-provenance)
- met
  
  Reproducible build
  
  Reproducible Builds · reproducible
  
  build is byte-reproducible
  
  [evidence](/#build-provenance)
- met
  
  SPDX SBOM
  
  SPDX · present + valid + complete + signed
  
  SPDX SBOM present, valid, complete, and signed
  
  [evidence](/sbom.spdx.json)
- met
  
  Content digests (RFC 9530)
  
  RFC 9530 · recommended
  
  Repr-Digest headers present (RFC 9530)
  
  [evidence](/provenance.json)
- met
  
  Signed release manifest
  
  Bounded Systems release bar · present + signed
  
  release manifest present and signed
  
  [evidence](/site.sha256)
- not assessed
  
  IPFS CID recorded
  
  IPFS / CIDv1 · recommended
  
  no IPFS CID report supplied (optional)
  
  [evidence](/#build-provenance)
- not assessed
  
  HTTP correctness (RFC 9110)
  
  RFC 9110 · recommended
  
  no RFC 9110 HTTP report supplied (optional)
  
  [evidence](/#build-provenance)
- not assessed
  
  OpenSSF Scorecard
  
  OpenSSF Scorecard · score ≥ 7.0
  
  no OpenSSF Scorecard result supplied
  
  [evidence](/#build-provenance)
- not assessed
  
  SLSA build level
  
  SLSA · ≥ target (default L3)
  
  no SLSA build level supplied
  
  [evidence](/#build-provenance)

### cognitive 1/3 met

cognitive: 1/3 met (1 unmet, 1 not assessed)

- met
  
  Interface-complexity budget (W3C COGA-derived)
  
  W3C COGA (derived) · budget (recommended)
  
  lone static checks clean (no findings)
  
  [evidence](/#build-provenance)
- unmet
  
  COGA Obj-5: Focus budget (attention proxy)
  
  W3C COGA Making Content Usable — Objective 5 · Obj-5 proxy (recommended)
  
  not-yet-met: readingGrade threshold exceeded, avgSentenceLength threshold exceeded, jargonDensity threshold exceeded. AGENT/STATIC PROXY for COGA Obj-5 — NOT COGA usability testing with cognitive disabilities. Do NOT mass-rewrite content — editorial is the maintainer's call; gate reports honestly.
  
  [evidence](/#build-provenance)
- not assessed
  
  COGA usability testing
  
  W3C COGA · manual (recommended)
  
  no COGA usability testing supplied (optional)
  
  [evidence](/#build-provenance)
