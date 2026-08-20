#!/usr/bin/env node
// P2 (hermetic half) — evidence resolves. The second predicate of
// docs/evidence-edges.md (.github-private): an evidence link must point at a
// specific file at an immutable ref, not at a repo root.
//
//   node scripts/check-evidence-pinned.mjs
//
// WHY THE REPO ROOT IS NOT EVIDENCE. validate-claims.mjs already requires
// `evidence` to be an absolute URL — but a repo root always resolves, so that
// check can never fail. It proves the link is well-formed, never that the
// mechanism the claim names still exists. A permalink to `<path>` at `<sha>` is
// immutable: it resolves to the same bytes forever, or it 404s. That is what
// makes "real, testable, self-consistent" checkable instead of asserted.
//
// GRADE-AWARE, AND THAT IS THE POINT. The framework doc first stated this flat —
// "every evidence link resolves to something testable at a pinned ref" — and
// implementing it disproved that: an ASPIRATIONAL claim has nothing testable by
// definition, which is exactly what the grade means. prx contains no file that
// evidences "prx and claude-box converge" (c5) or "contracts stay honest" (c6);
// pinning one would MANUFACTURE evidence — the precise overclaim this whole
// system exists to prevent. So:
//
//   enforced | partial  → evidence MUST be a pinned permalink to a path.
//   aspirational        → repo-level is correct; a pin is allowed, never required.
//                         The `gap` carries the "this is a bet" disclosure, and
//                         validate-claims.mjs already enforces that it is written.
//
// HERMETIC ON PURPOSE: shape only, no network. Whether the permalink still
// SERVES is liveness, and liveness belongs in the scheduled monitor
// (link-check.yml) — the same seam this repo already draws for external links,
// so a green build is never hostage to someone else's outage.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const claimsFile = join(root, "integrity", "claims", "claims.jsonld");

// https://github.com/<owner>/<repo>/blob/<40-hex-sha>/<path>
// A 40-hex sha and nothing else: a branch or tag name moves, so it pins nothing.
const PERMALINK = /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[0-9a-f]{40}\/\S+$/;
const MUST_PIN = new Set(["enforced", "partial"]);

const doc = JSON.parse(await readFile(claimsFile, "utf8"));
const assertion = (doc["@graph"] || []).find((g) => String(g["@id"]).endsWith("#assertion"));
const claims = assertion?.["@graph"] || [];

let errors = 0;
const fail = (msg) => { console.error(`✗ ${msg}`); errors++; };

if (!claims.length) fail(`${claimsFile}: no claims found`);

let pinned = 0;
for (const c of claims) {
  const id = String(c["@id"]).split("#")[1] || "(unnamed)";
  const evidence = String(c.evidence || "");
  if (!MUST_PIN.has(c.grade)) {
    // Aspirational: a pin is optional, but a malformed one is still an error.
    if (/\/blob\//.test(evidence) && !PERMALINK.test(evidence)) {
      fail(`${id}: evidence names a blob but is not a pinned permalink — ${evidence}`);
    }
    continue;
  }
  if (!PERMALINK.test(evidence)) {
    fail(`${id}: '${c.grade}' claim must pin evidence to <path> at a 40-hex sha, got ${evidence || "(empty)"}`);
    continue;
  }
  pinned++;
}

if (errors) { console.error(`\n✗ evidence not pinned (${errors})`); process.exit(1); }
console.log(`✓ ${pinned} graded claim(s) pin evidence to a path at an immutable ref; ${claims.length - pinned} aspirational claim(s) correctly unpinned`);
