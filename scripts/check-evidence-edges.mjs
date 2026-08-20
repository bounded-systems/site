#!/usr/bin/env node
// P1 — evidence edges. The first predicate of docs/evidence-edges.md
// (.github-private): a page that asserts must rest on something the honesty
// graph grades.
//
//   node scripts/check-evidence-edges.mjs
//
// Deterministic, dependency-free — same shape as the other check-*.mjs gates.
// Every post in blog/ must declare the claim IDs it rests on:
//
//   <!-- claims: c3, c6 -->
//
// and every declared ID must resolve in integrity/claims/claims.jsonld. A post
// with no edges is an essay: it can exist as a draft, it cannot ship. That is
// ESSAY DRIFT, and this gate is the thing that catches it.
//
// What this does NOT check: whether the post actually engages the claim it
// cites. Relevance is not machine-checkable here, so a citation is a author's
// assertion — this gate only proves the edge is DECLARED and RESOLVES. If
// pages start claim-stuffing (citing claims they don't engage) the predicate is
// checking the wrong thing; docs/evidence-edges.md says so under "what would
// change our mind".
//
// P2 (evidence links resolve to a testable path at a pinned ref) is a separate
// gate; this one stops at "the claim ID exists".
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const postsDir = join(root, "blog");
const claimsFile = join(root, "integrity", "claims", "claims.jsonld");

// The directive: an HTML comment, so it is invisible to a reader and stripped
// by gen-blog before rendering. Comma- or space-separated ids.
const DIRECTIVE = /<!--\s*claims:\s*([^>]*?)\s*-->/i;

export function parseEdges(md) {
  const m = md.match(DIRECTIVE);
  if (!m) return null; // no directive at all — distinct from an empty one
  return m[1].split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}

export async function claimIds(file = claimsFile) {
  const doc = JSON.parse(await readFile(file, "utf8"));
  const assertion = (doc["@graph"] || []).find((g) => String(g["@id"]).endsWith("#assertion"));
  const claims = assertion?.["@graph"] || [];
  return new Set(claims.map((c) => String(c["@id"]).split("#")[1]).filter(Boolean));
}

let errors = 0;
const fail = (msg) => { console.error(`✗ ${msg}`); errors++; };

const known = await claimIds();
if (!known.size) fail(`${claimsFile}: no claims found — the graph is empty or misshapen`);

const posts = (await readdir(postsDir)).filter((f) => f.endsWith(".md")).sort();
if (!posts.length) fail(`${postsDir}: no posts found`);

let edgeCount = 0;
for (const name of posts) {
  const md = await readFile(join(postsDir, name), "utf8");
  const edges = parseEdges(md);
  if (edges === null) {
    fail(`blog/${name}: no evidence edges — add '<!-- claims: cN -->' naming the claim(s) this post rests on`);
    continue;
  }
  if (!edges.length) {
    fail(`blog/${name}: empty claims directive — a page with no edges is an essay`);
    continue;
  }
  const unknown = edges.filter((id) => !known.has(id));
  if (unknown.length) {
    fail(`blog/${name}: claim(s) not in the graph: ${unknown.join(", ")} (known: ${[...known].join(", ")})`);
    continue;
  }
  edgeCount += edges.length;
}

if (errors) { console.error(`\n✗ evidence edges invalid (${errors})`); process.exit(1); }
console.log(`✓ ${posts.length} posts carry ${edgeCount} evidence edges — every edge resolves in the claims graph`);
