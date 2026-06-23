#!/usr/bin/env node
// Reader-view compatibility gate. Checks source HTML for elements that are
// invisible to browser reader modes (Safari, Firefox, Chrome): div/span with a
// "code" class. These must be <pre> or <code> elements to survive CSS stripping.
//
//   node scripts/check-reader.mjs          # fail on violations
//   node scripts/check-reader.mjs --check  # same (alias for check-script convention)
//
// Checks source HTML files only (index.html, 404.html). Blog HTML is generated
// from markdown by gen-blog.mjs which always emits <pre class="code"><code>.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Match <div or <span with a class attribute that contains the word "code".
// Does not flag <pre class="code"> or <code class="code"> — those are correct.
const DIV_SPAN_CODE = /<(div|span)([^>]*\bclass="[^"]*\bcode\b[^"]*")[^>]*>/gi;

const sources = ["index.html", "404.html"];
let violations = 0;

for (const filename of sources) {
  const html = await readFile(join(root, filename), "utf8");
  const lines = html.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const match of lines[i].matchAll(DIV_SPAN_CODE)) {
      console.error(`✗ ${filename}:${i + 1}: <${match[1]}${match[2]}> — use <pre> or <code> for reader-view compatibility`);
      violations++;
    }
  }
}

if (violations === 0) {
  console.log(`reader:check — ${sources.length} file(s) clean`);
} else {
  console.error(`reader:check — ${violations} violation(s) found`);
  process.exit(1);
}
