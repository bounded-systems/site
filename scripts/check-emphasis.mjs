#!/usr/bin/env node
// check-emphasis — emphasis must be GROUNDED IN THE GRAPH (RDF), never decorative.
//
// The rule: you may only emphasise a span that refers to a thing that exists as an entity
// in the page's JSON-LD. So:
//   <b class="term">  MUST carry data-term resolving to a DefinedTerm @id in the embedded
//                     glossary (or to the Organization @id). A term is a real graph node.
//   <em>              is FORBIDDEN — stress emphasis is linguistic, not an entity; it can't
//                     be represented as RDF, so it isn't emphasis here. Use plain text.
//   <strong>          a key claim (importance). Allowed; should ground to a schema:Claim
//                     (tracked — not yet enforced).
//
//   node scripts/check-emphasis.mjs   # fail the build on ungrounded emphasis
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SURFACES = ["index.html"];
let errors = 0;

for (const file of SURFACES) {
  const raw = readFileSync(join(root, file), "utf8");
  const html = raw.replace(/<!--[\s\S]*?-->/g, " "); // ignore comments (prose may mention <b class="term">)

  // The graph: every @id declared in the embedded JSON-LD (the glossary DefinedTerms,
  // the Organization). data-term must resolve to one of these.
  const ids = new Set();
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    for (const id of m[1].matchAll(/"@id"\s*:\s*"([^"]+)"/g)) ids.add(id[1]);
  }

  // <em> — forbidden (stress isn't an entity).
  for (const m of html.matchAll(/<em\b[^>]*>([\s\S]*?)<\/em>/gi)) {
    console.error(`✗ ${file}: <em>${m[1].slice(0, 30)}</em> — stress emphasis is not a graph entity; demote to plain text`);
    errors++;
  }

  // <b class="term"> — must resolve to a graph @id via data-term.
  for (const m of html.matchAll(/<b\b[^>]*\bclass="[^"]*\bterm\b[^"]*"[^>]*>([\s\S]*?)<\/b>/gi)) {
    const open = m[0].slice(0, m[0].indexOf(">") + 1);
    const ref = open.match(/\bdata-term="([^"]+)"/);
    if (!ref) { console.error(`✗ ${file}: <b class="term">${m[1].slice(0, 24)}</b> has no data-term — emphasis must reference a graph entity`); errors++; }
    else if (!ids.has(ref[1])) { console.error(`✗ ${file}: data-term="${ref[1]}" does not resolve to any @id in the page graph (glossary/org)`); errors++; }
  }
}

if (errors) { console.error(`✗ check-emphasis: ${errors} ungrounded emphasis — every emphasis must resolve to an RDF entity`); process.exit(1); }
console.log("✓ check-emphasis — every emphasised span resolves to a graph entity (term → DefinedTerm/Org; no decorative stress)");
