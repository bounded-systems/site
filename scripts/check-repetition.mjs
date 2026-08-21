#!/usr/bin/env node
// Count how often the site says the same thing twice.
//
//   node scripts/check-repetition.mjs            report + ratchet against the baseline
//   node scripts/check-repetition.mjs --list     print every pair, not just the top ones
//   node scripts/check-repetition.mjs --update   write the current count as the new baseline
//
// WHY NOT EXACT MATCHING. The obvious version of this check — find sentences that
// appear twice — finds almost nothing here: 2% of sentences repeat verbatim, and
// most of those are nav chrome. That number is reassuring and wrong. The way this
// site actually repeats itself is by RESTATEMENT: the homepage says
//
//   "Every claim on this page is graded against the running code."
//   "Every claim here is graded against the running code."
//   "A solo project — every claim on this page graded against the code that backs it."
//
// three times, in three phrasings, none of them an exact duplicate of another.
// So the comparison is over content words, not strings: strip stopwords and short
// words, take the set, and score pairs by Jaccard overlap. Two sentences sharing
// a third of their vocabulary are usually the same sentence written twice.
//
// It reads the MARKDOWN PROJECTION (content/pages/*.md and blog/*.md), not the
// HTML, so it sees the words a reader sees and nothing about markup. That is the
// other half of why gen-markdown.mjs exists.
//
// RATCHET, NOT A CLIFF. The current count is real and large; failing the build on
// it today would block every unrelated change, and a gate nobody can go green
// against gets switched off. So the committed baseline is the ceiling: a change
// may not add repetition, and when a change removes some, --update lowers the
// ceiling and it can never drift back up. Same shape as every other ratcheted
// property in the org (docs/agentic-code-hygiene.md).
//
// WHAT IT IS NOT. Vocabulary overlap is a proxy for restatement, not a judge of
// it. Two sentences can share their nouns and say opposite things, and a genuine
// callback ("as above, authority is the other axis") is repetition on purpose.
// The report is a reading list, not a verdict — which is why it prints the pairs
// rather than only the number.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const PAGES = join(root, "content", "pages");
const BLOG = join(root, "blog");
const BASELINE = join(root, "content", "repetition-baseline.json");

const LIST = process.argv.includes("--list");
const UPDATE = process.argv.includes("--update");

// A pair sharing a third of its content vocabulary. Calibrated by reading the
// output: at 0.30 genuine near-misses appear ("one sanctioned access point" vs
// "one sanctioned way through" — the same sentence), at 0.45 the clearest
// restatements are already being missed.
const THRESHOLD = Number(process.env.REPETITION_THRESHOLD || 0.34);
// Below this, sentences share vocabulary by accident rather than by meaning.
const MIN_WORDS = Number(process.env.REPETITION_MIN_WORDS || 7);

const STOP = new Set(
  ("a an the and or but if then than so as at by for from in into of on onto to with without " +
   "is are was were be been being am do does did done can could will would shall should may might must " +
   "it its this that these those there here what which who whom whose how why when where " +
   "i we you they he she them us our your their my me him her not no nor only just also even still yet " +
   "one two each every all any some many much more most less least other another same such own very " +
   "up down out off over under again further once because while about against between through during " +
   "before after above below since until unless whether both either neither per via").split(" "),
);

const words = (s) =>
  s.toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

// The comparison set: content words only, deduped. Short words carry too little
// signal and long ones dominate, which is what we want — "provenance", "authority",
// "attenuation" are the words that mark a sentence as being about a thing.
const signature = (s) => new Set(words(s).filter((w) => w.length > 3 && !STOP.has(w)));

const jaccard = (a, b) => {
  let hit = 0;
  for (const w of a) if (b.has(w)) hit++;
  return hit / (a.size + b.size - hit);
};

// An index that quotes what it indexes is not repeating itself. /blog reprints
// each post's opening lines by design, so every excerpt scores 100% against its
// own post — true, and not a finding.
const LISTING_PAGES = new Set(["content/pages/blog/index.md"]);

// Pull prose sentences out of markdown. Fenced code, table rows and projected
// data rows are not prose; list items and headings are.
function sentences(md) {
  const out = [];
  let inFence = false;

  // Rejoin hard-wrapped lines into paragraphs FIRST. The blog sources wrap at
  // about 76 columns, and splitting per line chops sentences mid-clause — the
  // fragments then match each other on the accident of where the wrap fell
  // rather than on what they say.
  const units = [];
  let buf = [];
  const flush = () => { if (buf.length) { units.push(buf.join(" ")); buf = []; } };
  for (const rawLine of md.replace(/<!--[\s\S]*?-->/g, "").split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("```")) { flush(); inFence = !inFence; continue; }
    if (inFence) continue;
    if (!line || line.startsWith("|")) { flush(); continue; }
    // A heading or a list item starts its own unit; a bare line continues one.
    if (/^(#{1,6}\s|[-*]\s|\d+\.\s|>\s)/.test(line)) flush();
    buf.push(line);
  }
  flush();

  for (const line of units) {
    // `**term** — definition` is how gen-markdown renders a projected data row
    // (a ledger entry, a desk row, a stat tile). Those repeat by construction —
    // six ledger genesis rows say "Genesis — state at ledger open" because that
    // is what six genesis rows ARE. Counting them as restatement would bury the
    // prose findings under data that is supposed to look alike.
    if (/^-?\s*\*\*[^*]+\*\*\s+—\s/.test(line)) continue;
    const text = line
      .replace(/^[#>\-*]+\s*/, "")
      .replace(/^\d+\.\s*/, "")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_]{1,2}/g, "")
      .trim();
    if (!text) continue;
    for (const s of text.split(/(?<=[.!?])\s+/)) {
      const t = s.trim();
      if (t.split(/\s+/).length >= MIN_WORDS) out.push(t);
    }
  }
  return out;
}

async function walk(dir, out = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// --- collect -----------------------------------------------------------------
const files = [...(await walk(PAGES)), ...(await walk(BLOG))].sort();
if (!files.length) {
  console.error("✗ check-repetition: no markdown found — run: node scripts/gen-markdown.mjs");
  process.exit(1);
}

const items = [];
for (const f of files) {
  const where = relative(root, f).split("\\").join("/");
  if (LISTING_PAGES.has(where)) continue;
  for (const s of sentences(await readFile(f, "utf8"))) {
    const sig = signature(s);
    if (sig.size >= 4) items.push({ where, s, sig });
  }
}

// --- pair --------------------------------------------------------------------
const pairs = [];
for (let i = 0; i < items.length; i++) {
  for (let j = i + 1; j < items.length; j++) {
    const score = jaccard(items[i].sig, items[j].sig);
    if (score >= THRESHOLD) pairs.push({ score, a: items[i], b: items[j] });
  }
}
pairs.sort((p, q) => q.score - p.score || p.a.s.localeCompare(q.a.s));

const withinPage = pairs.filter((p) => p.a.where === p.b.where).length;
const crossPage = pairs.length - withinPage;

// --- report ------------------------------------------------------------------
const show = LIST ? pairs : pairs.slice(0, 15);
for (const p of show) {
  const same = p.a.where === p.b.where;
  console.log(`\n  ${(p.score * 100).toFixed(0)}%  ${same ? p.a.where : `${p.a.where} ↔ ${p.b.where}`}`);
  console.log(`    ${p.a.s}`);
  console.log(`    ${p.b.s}`);
}
if (!LIST && pairs.length > show.length) {
  console.log(`\n  … ${pairs.length - show.length} more (run with --list to see them all)`);
}

console.log(
  `\n  ${items.length} sentences across ${files.length} page(s) · ` +
  `${pairs.length} restatement pair(s) at ≥${(THRESHOLD * 100).toFixed(0)}% shared vocabulary ` +
  `(${withinPage} within a page, ${crossPage} across pages)`,
);

// --- ratchet -----------------------------------------------------------------
let baseline = null;
try { baseline = JSON.parse(await readFile(BASELINE, "utf8")); } catch { /* first run */ }

// A missing baseline is NOT silently written. It happened once while this was
// being built: `npm run check` ran before the projection existed, saw only the
// five blog posts, and wrote a ceiling of 4 that the next run then "regressed"
// against. A ratchet that sets its own starting point from whatever it happened
// to see first is worse than no ratchet.
if (baseline === null && !UPDATE) {
  console.error(
    `\n✗ check-repetition: no baseline at ${relative(root, BASELINE)}.\n` +
    `  Make sure the projection is current (node scripts/gen-markdown.mjs), read the pairs above,\n` +
    `  then run \`node scripts/check-repetition.mjs --update\` to set the ceiling deliberately.`,
  );
  process.exit(1);
}

if (UPDATE) {
  await writeFile(
    BASELINE,
    JSON.stringify({
      $comment:
        "Ceiling for scripts/check-repetition.mjs. A change may not raise it. When a change LOWERS the " +
        "count, run `node scripts/check-repetition.mjs --update` and commit — the ceiling ratchets down " +
        "and cannot drift back up. The goal is not zero: a deliberate callback is repetition on purpose.",
      threshold: THRESHOLD,
      minWords: MIN_WORDS,
      pairs: pairs.length,
    }, null, 2) + "\n",
  );
  console.log(`\n✓ check-repetition: baseline written at ${pairs.length} pair(s).`);
  process.exit(0);
}

if (baseline.threshold !== THRESHOLD || baseline.minWords !== MIN_WORDS) {
  console.error(
    `\n✗ check-repetition: the baseline was measured at threshold ${baseline.threshold} / minWords ` +
    `${baseline.minWords}, but this run used ${THRESHOLD} / ${MIN_WORDS}. A ceiling only means ` +
    `something against the ruler that set it — re-measure with --update, deliberately.`,
  );
  process.exit(1);
}

if (pairs.length > baseline.pairs) {
  console.error(
    `\n✗ check-repetition: ${pairs.length} restatement pair(s), up from the baseline of ${baseline.pairs}.\n` +
    `  Something new says what the site already said. Cut it, or say it once and link to it.\n` +
    `  If the new pair is a deliberate callback, run --update and say so in the PR.`,
  );
  process.exit(1);
}

if (pairs.length < baseline.pairs) {
  console.log(
    `\n✓ check-repetition: ${pairs.length} pair(s) — ${baseline.pairs - pairs.length} fewer than the ` +
    `baseline of ${baseline.pairs}. Run \`node scripts/check-repetition.mjs --update\` and commit to ` +
    `ratchet the ceiling down.`,
  );
  process.exit(0);
}

console.log(`\n✓ check-repetition: ${pairs.length} pair(s), at the baseline ceiling of ${baseline.pairs}.`);
