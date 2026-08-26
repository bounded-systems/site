#!/usr/bin/env node
// legibility gate — deterministic half.
// Usage: node check.mjs <page.md> [lexicon.txt] [--jsonld]
//   --jsonld   also print the verdict as one bt:Claim node, for the graph the
//              page already publishes. The gate's result is a claim like any
//              other claim on the page; it goes in the existing graph rather
//              than getting a schema of its own. The `gap` field is the point:
//              it carries "this measures regression, not comprehension" into
//              the signed record so it cannot be quietly forgotten.
// Exit 1 on any violation. Budgets are constants below; change them in one place.

import { readFileSync } from "node:fs";
import { LEGIBILITY_CLAIM } from "./verdict.mjs";

const BUDGET = {
  heroWords: 170,      // words before the first `---` (what a skimmer gets for free)
  sentenceWords: 35,   // any sentence longer than this is two sentences
  acronyms: 10,        // unique ALL-CAPS tokens on the whole page
  h2Sections: 6,       // top-level sections a skimmer must hold
};

// Flags are filtered out of the positional slots, or `--jsonld` gets read as the
// lexicon path and the gate dies trying to open it.
const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const [pagePath, lexPath = new URL("lexicon.txt", import.meta.url).pathname] =
  process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!pagePath) { console.error("usage: check.mjs <page.md> [lexicon.txt]"); process.exit(2); }

const raw = readFileSync(pagePath, "utf8");

// Strip what a reader doesn't parse as prose: comments, code blocks, URLs, repo names.
const prose = raw
  // `-->|$` rather than `-->`: an UNTERMINATED comment would otherwise survive
  // the strip and have its body counted as prose — every budget below would then
  // be measuring an authoring note. CodeQL flagged the incomplete form on this
  // line. Not an extension of the gate: swallowing to end-of-file is what an
  // unterminated comment means, so this is the strip stripping comments.
  .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
  .replace(/```[\s\S]*?```/g, "")
  .replace(/\((https?:\/\/[^)]+|\/[^)]*|mailto:[^)]+|blog\/[^)]+)\)/g, "()")
  .replace(/\bguest-room\b/gi, "GUESTROOM")   // repo name, not the metaphor
  .replace(/\bclaude-box\b/gi, "CLAUDEBOX");

const fail = [];

// 1. Deny lexicon
const patterns = readFileSync(lexPath, "utf8")
  .split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
for (const p of patterns) {
  const m = prose.match(new RegExp(p, "gi"));
  if (m) fail.push(`lexicon: "${p}" → ${m.length}× (${[...new Set(m)].join(", ")})`);
}

// 2. Hero budget
const hero = prose.split(/^---$/m)[0];
const heroWords = (hero.match(/\b[\w'’-]+\b/g) ?? []).length;
if (heroWords > BUDGET.heroWords)
  fail.push(`hero: ${heroWords} words before first --- (budget ${BUDGET.heroWords})`);

// 3. Sentence length
// Blank lines split FIRST, then terminal punctuation. Without the paragraph
// split, `(?<=[.!?])\s+` runs straight through a blank line, so two adjacent
// list rows with no full stop between them — "**fs** — the one filesystem door"
// and the five seams after it — are measured as one 59-word sentence. That is a
// false positive about the instrument, not a finding about the page, and it
// would fire on any page with a short unpunctuated list. Not an extension of the
// gate: a sentence does not span a paragraph break, so this is the sentence rule
// measuring sentences.
const sentences = prose
  .replace(/^#+ .*$/gm, "").replace(/\[([^\]]*)\]/g, "$1")
  .split(/\n\s*\n/)
  .flatMap((para) => para.split(/(?<=[.!?])\s+/));
for (const s of sentences) {
  const n = (s.match(/\b[\w'’-]+\b/g) ?? []).length;
  if (n > BUDGET.sentenceWords)
    fail.push(`sentence: ${n} words (budget ${BUDGET.sentenceWords}): "${s.trim().slice(0, 70)}…"`);
}

// 4. Acronym budget (unique ALL-CAPS tokens, 2+ chars)
const acr = [...new Set(prose.match(/\b[A-Z][A-Z0-9]{1,9}\b/g) ?? [])]
  .filter(a => !["GUESTROOM", "CLAUDEBOX", "I"].includes(a));
if (acr.length > BUDGET.acronyms)
  fail.push(`acronyms: ${acr.length} unique (budget ${BUDGET.acronyms}): ${acr.join(", ")}`);

// 5. Section budget
const h2 = (raw.match(/^## /gm) ?? []).length;
if (h2 > BUDGET.h2Sections)
  fail.push(`sections: ${h2} h2s (budget ${BUDGET.h2Sections})`);

// 6. Optional: the verdict, as a node in the graph the page already publishes.
// The claim/gap text lives in verdict.mjs — the ONE source this emitter shares
// with the homepage registry renderer (gen-claims-rows.mjs) — so the page and
// the signed graph carry the same words. Only the grade and the run URL are
// computed here, because only this run knows them.
if (flags.includes("--jsonld")) {
  const run = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : LEGIBILITY_CLAIM.evidence;
  console.log(JSON.stringify({
    "@id": LEGIBILITY_CLAIM.id,
    "@type": "bt:Claim",
    claim: LEGIBILITY_CLAIM.claim,
    grade: fail.length ? "aspirational" : "enforced",
    gap: LEGIBILITY_CLAIM.gap,
    evidence: run,
  }, null, 2));
}

if (fail.length) {
  console.error(`legibility gate: FAIL (${fail.length})`);
  for (const f of fail) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`legibility gate: PASS — hero ${heroWords}w · ${h2} sections · ${acr.length} acronyms`);
