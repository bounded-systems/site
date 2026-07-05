#!/usr/bin/env node
// check-claim-discipline — a PROXY gate for prose that undercuts the site's own
// thesis (bounded authority, graded/proven claims). It flags three classes of
// language for review; it does NOT judge meaning — a human decides each.
//
//   node scripts/check-claim-discipline.mjs           # report candidates
//   node scripts/check-claim-discipline.mjs --strict  # exit 1 if any found
//
// ┌─ HONEST LABELING ───────────────────────────────────────────────────────────┐
// │ This is a lexical PROXY, like the cognitive focus-budget gate. It surfaces   │
// │ CANDIDATES by keyword; some flagged uses are legitimate (e.g. quoting, or    │
// │ "unbounded" as the *problem* the site names). It measures word choice, not   │
// │ truth. Treat output as a review list, not a verdict.                         │
// └─────────────────────────────────────────────────────────────────────────────┘

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// Three lexicons, each tied to a claim the site makes about itself.
const LEXICONS = {
  // UNBOUNDED — absolutes/totalizers, against a thesis of *bounded* authority.
  unbounded: [
    "unbounded", "infinite", "unlimited", "boundless", "always", "never",
    "everything", "anything", "everyone", "all cases", "100%", "fully",
    "completely", "totally", "guaranteed", "guarantees", "zero risk",
  ],
  // UNPROVEN — strength asserted, not shown; against *graded/proven* claims.
  unproven: [
    "proven", "battle-tested", "bulletproof", "bank-grade", "military-grade",
    "robust", "seamless", "effortless", "trivially", "obviously", "clearly",
    "simply", "of course", "needless to say", "it's easy",
  ],
  // VAGUE — imprecise quantity/frequency; erodes density.
  vague: [
    "some", "many", "various", "several", "a number of", "a lot", "lots of",
    "often", "usually", "generally", "typically", "kind of", "sort of",
    "stuff", "things", "etc",
  ],
};

/** Strip HTML to visible prose — drop <script>/<style>/<pre>/<code> + tags. */
function prose(html) {
  return html
    .replace(/<(script|style|pre|code)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ");
}

/** Sentence a match sits in, for review context. */
function sentenceAround(text, idx) {
  const start = Math.max(0, text.lastIndexOf(".", idx) + 1);
  let end = text.indexOf(".", idx);
  if (end < 0) end = text.length;
  return text.slice(start, end + 1).trim();
}

const PAGES = ["index.html", "404.html"];
const findings = [];

for (const page of PAGES) {
  let text;
  try {
    text = prose(await readFile(join(ROOT, page), "utf8"));
  } catch {
    continue;
  }
  const lower = text.toLowerCase();
  // "kind of X" / "sort of X" is a compound (one kind of power), not the hedge
  // "kind of hard" — only flag when NOT preceded by a determiner/quantifier.
  const DET = "(?<!\\b(?:one|each|a|an|the|every|per|this|that|any|no|some|two|three|four)\\s)";
  for (const [cls, words] of Object.entries(LEXICONS)) {
    for (const w of words) {
      const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const guard = (w === "kind of" || w === "sort of") ? DET : "";
      const re = new RegExp(`${guard}\\b${esc}\\b`, "gi");
      let m;
      while ((m = re.exec(lower)) !== null) {
        findings.push({ page, class: cls, word: w, sentence: sentenceAround(text, m.index) });
      }
    }
  }
}

if (findings.length === 0) {
  console.log("✓ claim-discipline: no unbounded / unproven / vague candidates");
  process.exit(0);
}

const byClass = { unbounded: [], unproven: [], vague: [] };
for (const f of findings) byClass[f.class].push(f);
console.log(`claim-discipline: ${findings.length} candidate(s) to review (proxy — not a verdict)\n`);
for (const cls of ["unbounded", "unproven", "vague"]) {
  const fs = byClass[cls];
  if (!fs.length) continue;
  console.log(`  ${cls.toUpperCase()} (${fs.length}):`);
  for (const f of fs.slice(0, 8)) {
    console.log(`    "${f.word}" — ${f.page}: …${f.sentence.slice(0, 90)}…`);
  }
  console.log("");
}

process.exit(process.argv.includes("--strict") ? 1 : 0);
