#!/usr/bin/env node
// check-copy-coverage — the single-source-copy ratchet.
//
//   1. FLOOR (gating): the surface's single-sourced (data-str) string count may only RISE.
//      A regression that un-wires copy — like the prose pass that dropped string-audit 22→6
//      (PR #130) — drops below the floor and FAILS here. Raise the floor as copy moves into
//      content/strings.json; never lower it.
//
//   2. DECISION (RESOLVED): the body-copy approach is settled — EXTERNAL-JARGON-LINKING, not
//      data-str-md. Atomic micro-copy (headings/labels/CTAs) is single-sourced in strings.json
//      and protected by the floor; the body PROSE stays inline BY DESIGN (a paragraph is
//      content, not a token), and "no unexplained jargon" is enforced separately by
//      check-jargon.mjs (every external term linked to its source). So the body paragraphs
//      are no longer debt — they are intentional inline content with grounded jargon.
//
//   node scripts/check-copy-coverage.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FLOOR = 22; // single-sourced data-str elements on index.html — ratchet up, never down
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");

const wired = (html.match(/\bdata-str(?:-md)?="/g) || []).length;

console.log(`copy-coverage — ${wired} atomic strings single-sourced (floor ${FLOOR}); body prose stays inline by design (external-jargon-linking; jargon grounded by check-jargon)`);
if (wired < FLOOR) {
  console.error(`✗ check-copy-coverage: single-sourced copy fell to ${wired}, below the floor of ${FLOOR} — copy was un-wired (a regression). Restore data-str, or lower the floor only deliberately.`);
  process.exit(1);
}
console.log(`✓ check-copy-coverage — single-source floor holds (${wired} ≥ ${FLOOR})`);
