#!/usr/bin/env node
// check-grammar-repetition — a PROXY gate for monotonous sentence structure:
// the same opener used over and over ("It's a… It's the… It's a…"). Repetitive
// grammar reads as flat and lowers density; this surfaces it for review.
//
//   node scripts/check-grammar-repetition.mjs           # report over-repeated openers
//   node scripts/check-grammar-repetition.mjs --strict  # exit 1 if any exceed the threshold
//
// ┌─ HONEST LABELING ───────────────────────────────────────────────────────────┐
// │ A structural PROXY, like focus-budget/claim-discipline. It counts the first  │
// │ two words of each sentence; deliberate anaphora (a rhetorical repeat) will   │
// │ trip it and is fine. It measures form, not quality — a review list.          │
// └─────────────────────────────────────────────────────────────────────────────┘

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const THRESHOLD = 3; // an opener used > this many times is flagged

/** Strip HTML to visible prose. */
function prose(html) {
  return html
    .replace(/<(script|style|pre|code)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ");
}

/** Split into sentences and return each one's opener (first two words, lc). */
function openers(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 4) // ignore fragments/labels
    .map((s) => {
      const words = s.replace(/^[^A-Za-z]+/, "").toLowerCase().split(/\s+/);
      return { opener: words.slice(0, 2).join(" "), sentence: s };
    })
    .filter((o) => o.opener);
}

const PAGES = ["index.html", "404.html"];
const counts = new Map(); // opener -> { n, examples[] }

for (const page of PAGES) {
  let text;
  try {
    text = prose(await readFile(join(ROOT, page), "utf8"));
  } catch {
    continue;
  }
  for (const { opener, sentence } of openers(text)) {
    const e = counts.get(opener) ?? { n: 0, examples: [] };
    e.n += 1;
    if (e.examples.length < 3) e.examples.push(sentence.slice(0, 70));
    counts.set(opener, e);
  }
}

const flagged = [...counts.entries()]
  .filter(([, e]) => e.n > THRESHOLD)
  .sort((a, b) => b[1].n - a[1].n);

if (flagged.length === 0) {
  console.log(`✓ grammar-repetition: no opener used more than ${THRESHOLD}× (proxy)`);
  process.exit(0);
}

console.log(
  `grammar-repetition: ${flagged.length} over-repeated opener(s) to review (proxy — not a verdict)\n`,
);
for (const [opener, e] of flagged) {
  console.log(`  "${opener}…" ×${e.n}`);
  for (const ex of e.examples) console.log(`      · ${ex}…`);
}

process.exit(process.argv.includes("--strict") ? 1 : 0);
