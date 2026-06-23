#!/usr/bin/env node
// Guard the public copy against the AI-isms the M0 cold read flagged by name.
// Scans index.html + blog/*.md and fails if any banned cadence reappears.
//
//   node scripts/check-copy.mjs   # exit 1 on any match
//
// Keep the patterns tight: they must never catch the honest "not yet signed"
// claim-gaps (Lane C honesty) — only the flagged cadences.
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const BANNED = [
  { re: /\beasy part\b/i,                 why: '"the easy part…" cadence' },
  { re: /\bhard part\b/i,                 why: '"…the hard part" cadence' },
  { re: /\bhard,?\s+unsolved part\b/i,    why: '"the hard, unsolved part" cadence' },
  { re: /\bincluding this one\b/i,        why: "self-referential grade" },
  { re: /isn['’]t\b[^.!?\n]{0,60}—[^.!?\n]{0,60}\bit['’]s\b/i, why: `"it isn't X — it's Y" cadence` },
];

const targets = ["index.html"];
for (const f of (await readdir(join(root, "blog"))).filter((f) => f.endsWith(".md"))) {
  targets.push(join("blog", f));
}

let hits = 0;
for (const rel of targets) {
  const lines = (await readFile(join(root, rel), "utf8")).split("\n");
  lines.forEach((line, i) => {
    for (const { re, why } of BANNED) {
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
console.log(`copy:check — ${targets.length} surface(s) clean.`);
