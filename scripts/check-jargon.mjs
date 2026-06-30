#!/usr/bin/env node
// check-jargon — every jargon term, when used, must be GROUNDED: linked to its source.
//
// This is the chosen body-copy discipline (external-jargon-linking): the body prose stays
// inline, but no unexplained jargon survives — each external concept in data/jargon.json,
// if it appears in the prose, must appear at least once inside an <a> link to its source.
// It's the external complement to the internal DefinedTerm glossary (check-emphasis), and it
// is what makes "keep the prose inline" honest rather than a way to smuggle in raw jargon.
//
//   node scripts/check-jargon.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vocab = JSON.parse(readFileSync(join(root, "data/jargon.json"), "utf8"));
const SURFACES = ["index.html"];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let errors = 0, grounded = 0;

for (const file of SURFACES) {
  const html = readFileSync(join(root, file), "utf8");
  for (const term of Object.keys(vocab)) {
    if (term.startsWith("$")) continue;
    const word = new RegExp(`(?<![\\w-])${esc(term)}(?![\\w-])`);
    if (!word.test(html)) continue; // not used on this surface
    // Every link whose text carries this term must point at the ONE source URL in
    // data/jargon.json — the URL value lives in the vocabulary (base layer), the inline
    // href is a drift-checked reference, never a second copy.
    const links = [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([^<]*)<\/a>/gi)].filter((l) => word.test(l[2]));
    if (links.length === 0) { console.error(`✗ ${file}: jargon "${term}" is used but never linked — ground it to ${vocab[term]} on first use`); errors++; continue; }
    // At least one link must ground the term to its ONE source URL (data/jargon.json). Other
    // links (e.g. an internal route) are fine — but the source URL lives in the vocab, so the
    // grounding href can't drift from it.
    if (!links.some((l) => l[1] === vocab[term])) { console.error(`✗ ${file}: jargon "${term}" is linked, but none point at its source ${vocab[term]} — the grounding URL drifted from data/jargon.json`); errors++; continue; }
    grounded++;
  }
}

if (errors) { console.error(`✗ check-jargon: ${errors} ungrounded jargon term(s) — every jargon term must link to its source`); process.exit(1); }
console.log(`✓ check-jargon — ${grounded} jargon term(s) grounded (linked to source); no unexplained jargon`);
