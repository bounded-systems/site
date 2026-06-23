#!/usr/bin/env node
// Guard the public copy against the AI-isms the M0 cold read flagged by name.
// Scans index.html + blog/*.md and fails if any banned cadence reappears.
//
//   node scripts/check-copy.mjs          # prose gate — exit 1 on any match
//   node scripts/check-copy.mjs --code   # also flag clever/anthropomorphic
//                                         # in-code comments (opt-in, looser)
//
// Keep the prose patterns tight: they must never catch the honest "not yet
// signed" claim-gaps (Lane C honesty) — only the flagged cadences. The --code
// tells are advisory and kept off the default gate on purpose: comment voice is
// fuzzier to lint, so it's a flag you run, not a wall the build dies on.
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const CODE = process.argv.includes("--code");

const BANNED = [
  { re: /\beasy part\b/i,                 why: '"the easy part…" cadence' },
  { re: /\bhard part\b/i,                 why: '"…the hard part" cadence' },
  { re: /\bhard,?\s+unsolved part\b/i,    why: '"the hard, unsolved part" cadence' },
  { re: /\bincluding this one\b/i,        why: "self-referential grade" },
  { re: /isn['’]t\b[^.!?\n]{0,60}—[^.!?\n]{0,60}\bit['’]s\b/i, why: `"it isn't X — it's Y" cadence` },
];

// Opt-in (--code): clever or anthropomorphic phrasings that drew a literal
// "what?" in the cold read. Comment voice should describe what the line does.
const CODE_TELLS = [
  { re: /nothing else exists/i,  why: "dramatic comment — say what the line does" },
  { re: /\bthe rulebook\b/i,     why: "anthropomorphic comment" },
  { re: /\bis honest about\b/i,  why: "anthropomorphic comment" },
];

const patterns = CODE ? [...BANNED, ...CODE_TELLS] : BANNED;

const targets = ["index.html"];
for (const f of (await readdir(join(root, "blog"))).filter((f) => f.endsWith(".md"))) {
  targets.push(join("blog", f));
}

let hits = 0;
for (const rel of targets) {
  const lines = (await readFile(join(root, rel), "utf8")).split("\n");
  lines.forEach((line, i) => {
    for (const { re, why } of patterns) {
      if (re.test(line)) {
        console.error(`✗ ${rel}:${i + 1} — ${why}\n    ${line.trim().slice(0, 120)}`);
        hits++;
      }
    }
  });
}

if (hits) {
  console.error(`\ncopy:check — ${hits} flagged phrase(s). Rewrite in plain voice (see the M0 cold read).`);
  process.exit(1);
}
console.log(`copy:check — ${targets.length} surface(s) clean${CODE ? " (incl. in-code comments)" : ""}.`);
