#!/usr/bin/env node
// Render dist/conformance.html + dist/api/v1/conformance.json — bounded.tools'
// own honest conformance projection.
//
//   node scripts/gen-conformance.mjs    # write the page + the machine-readable twin
//
// The capstone of the honesty system: don't just PRODUCE conformance evidence,
// COMPUTE and SHOW it. The vendored conformance-kit's conformance-report folds
// lone's web-build standard (a zero-dep Node port of jsr:@bounded-systems/lone@0.4's
// conformance() model) over the evidence this build can establish, and reports
// everything else honestly as `not-assessed`. The model makes overclaim impossible:
// the strong compact claim is emitted ONLY when every tier-1 required criterion is
// met — so automation can never print "WCAG 2.2 AA" or "ASVS conformant" on its own.
//
// Evidence comes from two layers, in precedence order (last wins):
//   1. data/conformance-evidence.json — the committed evidence CONTRACT: the gate
//      verdicts bounded.tools genuinely verifies (SHACL conforms, technical SEO
//      clean, SBOM complete+signed, the signed+verified site manifest, the RFC 9530
//      Repr-Digest headers, the hermetic reproducible build, lone's 0-error DOM
//      blessing). Each entry is re-proven by a gate that BLOCKS on failure, so it
//      can't drift from reality without turning CI red (see that file's _gates map).
//   2. in-process build-facts — what THIS render self-checks and so asserts most
//      directly: llms.txt is present in dist/ and every blog post exposes a Markdown
//      sibling (the ai-readability tier-2 criterion).
// The automatable axe-core serious/critical scan IS asserted (gate-backed by
// axe.yml's real-browser Playwright run — see data/conformance-evidence.json).
// HONEST: the manual + external GATING criteria (manual WCAG 2.2 AA audit, OWASP
// ASVS L2, Nu HTML Checker, Core Web Vitals field data, Baseline, known-vuln
// scan, runtime reliability, CommonMark), plus the criteria bounded.tools does not
// emit at all (in-toto/SLSA statement, IPFS CID, OpenAPI, Atom feed), are NOT
// supplied by any layer → they report `not-assessed` and the strong WCAG/ASVS
// compact claim stays withheld.
import { readFile, writeFile, mkdir, readdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildConformanceReport, renderConformanceReport } from "../vendor/conformance-kit/gates/conformance-report.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const SITE = "https://bounded.tools";

const exists = async (p) => { try { await access(p); return true; } catch { return false; } };
const loadJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── evidence: the committed contract, then this build's self-checked facts ──────
const evContract = (await exists(join(root, "data", "conformance-evidence.json")))
  ? await loadJson(join(root, "data", "conformance-evidence.json")) : {};

// ai-readability is the one criterion this render can assert directly: llms.txt is
// copied into dist/ by build.mjs, and gen-blog.mjs writes a Markdown sibling next to
// every rendered post. Self-check both against the built dist/ so the assertion is
// about THESE bytes, not a hand-edited claim.
const blogFiles = (await exists(join(dist, "blog")))
  ? (await readdir(join(dist, "blog"))).filter((f) => f.endsWith(".html") && f !== "index.html")
  : [];
const mdSiblingsOk = blogFiles.length > 0 &&
  (await Promise.all(blogFiles.map((f) => exists(join(dist, "blog", f.replace(/\.html$/, ".md")))))).every(Boolean);
const llmsTxtOk = await exists(join(dist, "llms.txt"));
const buildFacts = {
  aiReadability: { llmsTxtPresent: llmsTxtOk, linksResolve: mdSiblingsOk, markdownSiblings: mdSiblingsOk },
};

const confEvidence = { ...(evContract.evidence ?? {}), ...buildFacts };
const confLoneFindings = Array.isArray(evContract.loneFindings) ? evContract.loneFindings : null;

const report = buildConformanceReport({ loneFindings: confLoneFindings, evidence: confEvidence });

// ── machine-readable twin ───────────────────────────────────────────────────
await mkdir(join(dist, "api", "v1"), { recursive: true });
await writeFile(join(dist, "api", "v1", "conformance.json"), JSON.stringify(report, null, 2) + "\n");

// ── per-criterion evidence links ────────────────────────────────────────────
// Each target either resolves in the built dist/ (the SBOM, llms.txt, sitemap) or is
// a known deploy-time sidecar the structure-audit allow-lists (/provenance.json,
// /site.sha256); everything else points at the on-page signed-provenance section.
const EVIDENCE_LINKS = {
  "integrity.sbom": "/sbom.spdx.json",
  "integrity.signed-release-manifest": "/site.sha256",
  "integrity.content-digests": "/provenance.json",
  "integrity.reproducible-build": "/#build-provenance",
  "semantic.jsonld-shacl": "/#build-provenance",
  "semantic.ai-readability": "/llms.txt",
  "seo.technical": "/sitemap.xml",
};
const evidenceHref = (c) => EVIDENCE_LINKS[c.id] ?? "/#build-provenance";

const s = report.summary;
const description =
  `bounded.tools graded against lone's web-build conformance standard: ` +
  `${s.met}/${s.total} criteria met, ${s.notAssessed} not assessed. ` +
  `The strong WCAG 2.2 AA / OWASP ASVS claim is withheld until every gating criterion is verified.`;

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Conformance — Bounded Systems</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${SITE}/conformance">
  <link rel="icon" type="image/png" href="brand/favicon-32.png">
  <meta name="theme-color" content="#0C5A42">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Bounded Systems">
  <meta property="og:url" content="${SITE}/conformance">
  <meta property="og:title" content="Conformance — Bounded Systems">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${SITE}/brand/lockup/lockup-forest-1200.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Bounded Systems — bounded authority for AI agents">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Conformance — Bounded Systems">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${SITE}/brand/lockup/lockup-forest-1200.png">
  <link rel="stylesheet" href="brand/css/fonts.css">
  <link rel="stylesheet" href="brand/tokens/tokens.css">
  <link rel="stylesheet" href="brand/css/base.css">
  <link rel="stylesheet" href="styles.css">
</head>
<body id="top">
  <nav class="nav">
    <div class="nav__inner">
      <a class="lock" href="index.html">
        <span class="mark mark--rounded" style="width:28px;height:28px;"><img src="brand/mark/mark-white.svg" width="20" height="20" alt="Bounded Systems"></span>
        <span class="lock__name">bounded.tools</span>
      </a>
      <button type="button" class="nav__burger" aria-expanded="false" aria-controls="nav-menu" aria-label="Menu"><span></span><span></span><span></span></button>
      <div class="nav__links" id="nav-menu">
        <a href="index.html#honesty">Honesty</a>
        <a href="index.html#proof">Proof</a>
        <a href="blog/">Writing</a>
        <a class="nav__gh" href="https://github.com/bounded-systems">GitHub&nbsp;&#8599;</a>
      </div>
    </div>
  </nav>
  <main class="wrap conf">
    <header class="conf__intro">
      <p class="bs-text-label eyebrow"><a href="index.html#honesty">&larr;&nbsp;Kept honest</a></p>
      <h1>Conformance, computed against the running build</h1>
      <p class="conf__lead">The honesty section grades each <em>claim</em> by hand. This page does the opposite: it folds the gate verdicts this build genuinely verifies through <a href="https://github.com/bounded-systems/lone"><code>lone</code></a>'s web-build conformance model, and reports everything it cannot verify as <strong>not assessed</strong> — never as met. The strong WCAG&nbsp;2.2&nbsp;AA / OWASP&nbsp;ASVS claim is emitted only when every gating criterion passes, so this report can never overclaim on its own.</p>
      <p class="conf__machine"><a href="api/v1/conformance.json">machine-readable report&nbsp;&#8599;</a> &middot; <a href="index.html#build-provenance">the signed build provenance</a></p>
    </header>
    ${renderConformanceReport(report, { evidenceHref })}
  </main>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__lock">
        <span class="mark mark--rounded" style="width:26px;height:26px;"><img src="brand/mark/mark-white.svg" width="18" height="18" alt=""></span>
        <span>Bounded Systems</span>
      </div>
      <div class="footer__meta">Graded against ${esc(report.standard)} v${esc(report.version)} &middot; bounded.tools</div>
    </div>
  </footer>
  <script src="nav.js" defer></script>
</body>
</html>
`;

await writeFile(join(dist, "conformance.html"), page);
console.log(`✓ conformance: ${s.met}/${s.total} met · ${s.unmet} unmet · ${s.notAssessed} not assessed → dist/conformance.html + dist/api/v1/conformance.json`);
