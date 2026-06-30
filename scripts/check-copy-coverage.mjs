#!/usr/bin/env node
// check-copy-coverage — the single-source-copy ratchet + the remaining-debt tracker.
//
// This files the open body-copy work AS CI, so it can't be lost or silently regressed:
//
//   1. FLOOR (gating): the surface's single-sourced (data-str) string count may only RISE.
//      A regression that un-wires copy — like the prose pass that dropped string-audit 22→6
//      (PR #130) — drops below the floor and FAILS here. Raise the floor as copy moves into
//      content/strings.json; never lower it.
//
//   2. DEBT (reported): the body paragraphs still carried as static text in the HTML. This is
//      tracked, not yet enforced — its single-sourcing is BLOCKED on a decision (below).
//
//   3. DECISION (recorded): how the body prose gets single-sourced is undecided —
//        (a) external-jargon-linking (link each term to its source; prose stays inline), or
//        (b) data-str-md (markdown-valued strings.json + a renderer).
//      They overlap, so building both undoes work. Tracked in beads prx-gwr8. Until it's
//      decided, the body paragraphs stay static BY DECISION, surfaced here as debt — not a
//      silent backlog.
//
//   node scripts/check-copy-coverage.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FLOOR = 22; // single-sourced data-str elements on index.html — ratchet up, never down
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");

const wired = (html.match(/\bdata-str(?:-md)?="/g) || []).length;
let debt = 0;
for (const m of html.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)) {
  // Raw inner-content length is a fine proxy for "a substantial body paragraph". We don't
  // strip tags — this is a metric, not a sanitiser, and a partial tag-strip is both
  // unnecessary and (per CodeQL js/incomplete-multi-character-sanitization) a smell.
  if (m[2].trim().length > 40 && !/\bdata-str/.test(m[1])) debt++;
}

console.log(`copy-coverage — ${wired} single-sourced (floor ${FLOOR}); ${debt} body paragraph(s) still static (tracked debt, blocked on the body-copy approach decision — beads prx-gwr8)`);
if (wired < FLOOR) {
  console.error(`✗ check-copy-coverage: single-sourced copy fell to ${wired}, below the floor of ${FLOOR} — copy was un-wired (a regression). Restore data-str, or lower the floor only deliberately.`);
  process.exit(1);
}
console.log(`✓ check-copy-coverage — single-source floor holds (${wired} ≥ ${FLOOR})`);
