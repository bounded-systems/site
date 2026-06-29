#!/usr/bin/env node
// check-outline — the document structure is an INVARIANT, asserted directly, not a baseline.
//
// structure-audit is a content-addressed baseline: regenerating structure.json silently
// moves it, so a prose edit built on a STALE base can revert real headings (cards back to
// <div>, a section's <h2> deleted) and still pass once the baseline is re-blessed. This gate
// asserts the SHAPE of the outline itself, so that regression fails CI and cannot merge:
//   1. exactly one <h1> (the page title);
//   2. no skipped heading levels (h2 → h4 is a hole);
//   3. every card that carries a title is a heading — each .proof-card and each .seams__head
//      MUST contain an <h{2..6}> (not a <div>/<span> dressed as one);
//   4. every <section> has a heading somewhere inside it.
//
//   node scripts/check-outline.mjs        # over the source surface(s)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SURFACES = ["index.html"];
let errors = 0;
const fail = (f, m) => { console.error(`✗ ${f}: ${m}`); errors++; };

for (const file of SURFACES) {
  const html = readFileSync(join(root, file), "utf8").replace(/<!--[\s\S]*?-->/g, " ");

  // 1 + 2 — one h1, no skipped levels.
  const levels = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => +m[1]);
  const h1s = levels.filter((l) => l === 1).length;
  if (h1s !== 1) fail(file, `expected exactly one <h1>, found ${h1s}`);
  let prev = 0;
  for (const l of levels) { if (prev && l > prev + 1) fail(file, `skipped heading level: h${prev} → h${l}`); prev = l; }

  // 3 — title-bearing cards must use a real heading element.
  const cardRules = [
    { sel: "proof-card", re: /<a\b[^>]*\bclass="[^"]*\bproof-card\b[^"]*"[^>]*>([\s\S]*?)<\/a>/gi },
    { sel: "seams__head", re: /<div\b[^>]*\bclass="[^"]*\bseams__head\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi },
  ];
  for (const { sel, re } of cardRules) {
    let n = 0;
    for (const m of html.matchAll(re)) { n++; if (!/<h[2-6]\b/i.test(m[1])) fail(file, `.${sel} #${n} has no heading element — a card title must be an <h{2..6}>, not a <div>/<span>`); }
    if (n === 0) fail(file, `expected at least one .${sel} — structure missing?`);
  }

  // 4 — every <section> contains a heading.
  for (const m of html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)) {
    const id = (m[1].match(/\bid="([^"]+)"/) || [, "(no id)"])[1];
    // strip nested sections so we test THIS section's own content
    const own = m[2].replace(/<section\b[\s\S]*?<\/section>/gi, " ");
    if (!/<h[1-6]\b/i.test(own)) fail(file, `<section id="${id}"> has no heading`);
  }
}

if (errors) { console.error(`✗ check-outline: ${errors} structural violation(s) — the outline contract is broken`); process.exit(1); }
console.log("✓ check-outline — outline contract holds (one h1, no skips, every card/section has a real heading)");
