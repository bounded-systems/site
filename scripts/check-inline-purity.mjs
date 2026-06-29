#!/usr/bin/env node
// check-inline-purity — no static dimension in an inline style="". Every length must be a
// token (the base layer); only 1px hairlines may stay raw. The CSS purity discipline doesn't
// reach inline styles, so this closes the gap — a raw value can't sneak back in via style="".
//
//   node scripts/check-inline-purity.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SURFACES = ["index.html"];
let errors = 0;

for (const file of SURFACES) {
  const html = readFileSync(join(root, file), "utf8");
  for (const m of html.matchAll(/style="([^"]*)"/g)) {
    for (const len of m[1].matchAll(/(\d*\.?\d+)px\b/g)) {
      if (parseFloat(len[1]) === 1) continue; // hairline exception
      console.error(`✗ ${file}: inline style has a raw dimension "${len[0]}" — use a token (var(--space-*) / var(--text-*) / var(--radius-*))`);
      errors++;
    }
  }
}

if (errors) { console.error(`✗ check-inline-purity: ${errors} raw inline value(s) — only the base layer holds values`); process.exit(1); }
console.log("✓ check-inline-purity — no static dimension in inline styles (every length is a token; 1px hairlines excepted)");
