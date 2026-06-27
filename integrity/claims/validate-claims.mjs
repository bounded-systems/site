#!/usr/bin/env node
// integrity · validate-claims — the structure-audit "claims" check, in miniature.
//
//   node integrity/claims/validate-claims.mjs integrity/claims/example.jsonld
//
// Deterministic, dependency-free. Given a nanopublication-shaped claims graph
// (assertion / provenance / publication-info named graphs — see README.md), it
// asserts the invariants that make "every claim points at backing code" CHECKABLE
// rather than asserted:
//   - each claim has non-empty `claim` text
//   - `grade` ∈ { enforced, partial, aspirational }
//   - a non-`enforced` claim names its `gap` (the honesty rule: a partial/aspirational
//     claim must write the gap down)
//   - `evidence` is an absolute URL (the resolvable backing-code link)
//   - the publication-info graph names `securedBy` (the signature that makes the
//     graph itself verifiable — the Sigstore bundle, same keyless envelope as the build)
// Exit 0 iff every claim and the envelope check out; exit 1 otherwise.
//
// This proves nothing about whether a claim is TRUE — only that it is well-formed,
// graded, gap-disclosed, evidence-linked, and signed. Structure + verifiable
// issuance, not legitimacy. Resolving the evidence link to the running code is the
// reader's (out-of-page) step.
import { readFile } from "node:fs/promises";

const GRADES = new Set(["enforced", "partial", "aspirational"]);
const file = process.argv[2];
if (!file) { console.error("usage: validate-claims <claims.jsonld>"); process.exit(2); }

const doc = JSON.parse(await readFile(file, "utf8"));
const graphs = Object.fromEntries((doc["@graph"] || []).map((g) => [String(g["@id"]).split("#")[1] || g["@id"], g["@graph"] || []]));

let errors = 0;
const fail = (msg) => { console.error(`✗ ${msg}`); errors++; };
const isUrl = (s) => /^https?:\/\/\S+$/.test(String(s || ""));

const claims = graphs["assertion"] || [];
if (!claims.length) fail("assertion graph has no claims");
for (const c of claims) {
  const id = c["@id"] || "(unnamed)";
  if (!String(c.claim || "").trim()) fail(`${id}: empty claim text`);
  if (!GRADES.has(c.grade)) fail(`${id}: grade '${c.grade}' not in {${[...GRADES].join(", ")}}`);
  if (c.grade !== "enforced" && !String(c.gap || "").trim()) fail(`${id}: '${c.grade}' claim must disclose a gap`);
  if (!isUrl(c.evidence)) fail(`${id}: evidence is not an absolute URL (${c.evidence})`);
}

// publication-info must name how the graph itself is secured.
const pub = (graphs["pubinfo"] || [])[0] || {};
if (!isUrl(pub.securedBy)) fail("pubinfo: missing securedBy (the signature over this graph)");

if (errors) { console.error(`\n✗ claims invalid (${errors})`); process.exit(1); }
console.log(`✓ ${claims.length} claims valid — graded, gap-disclosed, evidence-linked, secured (${pub.securedBy})`);
