#!/usr/bin/env node
// Copy-hygiene gate, backed by string-audit (vendored as a git submodule at
// vendor/string-audit, pinned to a release tag). Replaces the bespoke pattern
// list with the shared, data-driven checks: ai-tells.json + the prose
// heuristics in prose.mjs (aiIsms / overclaims / proofread / readability).
//
//   node scripts/check-copy.mjs            # fail on error-level findings
//   node scripts/check-copy.mjs --verbose  # also list warn/suggestion findings
//
// Gate threshold = error only:
//   • ai-tells "error" rules — chatbot/placeholder artifacts (e.g. "as an AI
//     language model", unfilled [placeholder], lorem ipsum).
//   • overclaims — absolute coverage/security claims (Lane-C honesty): the
//     "every privileged effect" shape, "100%", "guaranteed", etc.
// warn/suggestion (em-dash cadence, readability, proofread tells) are advisory:
// they include voice-forward signals we keep on purpose, so they never fail CI.
//
// prose.mjs reads its own dictionary.txt + ai-tells.json from the submodule and
// resolves its two npm deps (an-array-of-english-words, write-good) from the
// repo-root node_modules — so a plain `npm ci` here is all it needs.
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { aiIsms, overclaims, proofread, readability } from "../vendor/string-audit/prose.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const VERBOSE = process.argv.includes("--verbose");

// Reduce each surface to its visible prose so the checks see sentences, not markup.
const stripHtml = (s) => s
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&middot;/g, " · ")
  .replace(/&rarr;|&#\d+;/g, " ")
  .replace(/[ \t]+/g, " ");
const stripMd = (s) => s.replace(/```[\s\S]*?```/g, " ").replace(/[#>*`_[\]()]/g, " ");

const surfaces = [["index.html", stripHtml]];
for (const f of (await readdir(join(root, "blog"))).filter((f) => f.endsWith(".md"))) {
  surfaces.push([join("blog", f), stripMd]);
}

const tally = { error: 0, warn: 0, suggestion: 0 };
const errors = [];
for (const [rel, strip] of surfaces) {
  const text = strip(await readFile(join(root, rel), "utf8"));
  const blocks = text.split(/\n\s*\n|\.\s+(?=[A-Z])/).map((b) => b.trim()).filter((b) => b.length > 20);
  for (const b of blocks) {
    for (const { level, msg } of [...aiIsms(b), ...overclaims(b), ...proofread(b), ...readability(b)]) {
      tally[level] = (tally[level] || 0) + 1;
      if (level === "error") errors.push(`✗ ${rel} — ${msg}\n    …${b.slice(0, 96)}…`);
      else if (VERBOSE) console.error(`  ${level}: ${rel} — ${msg}`);
    }
  }
}

for (const e of errors) console.error(e);
console.log(
  `copy:check (string-audit @ vendor/string-audit) — ` +
  `${tally.error} error · ${tally.warn} warn · ${tally.suggestion} suggestion (gate: error)`,
);
if (tally.error) {
  console.error("\nError-level findings block the build. Scope the absolute, or link a source (Lane C).");
  process.exit(1);
}
