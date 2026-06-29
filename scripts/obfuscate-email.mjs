#!/usr/bin/env node
// Build-time email obfuscation — entity-encode email addresses in the BUILT HTML so
// naive scrapers can't regex them out, with NO client JS.
//
//   node scripts/obfuscate-email.mjs [distDir]   # default: dist
//
// This replaces Cloudflare's Email Obfuscation (which we keep OFF in the zone, see
// infra/cloudflare): CF's version rewrites the HTML at the edge and injects a decode
// script — the exact mutation that strips our ETag (and a runtime we don't want). HTML
// numeric character references (e.g. `&#64;` for `@`) are decoded natively by browsers,
// so `mailto:` links and visible addresses keep working without a single byte of JS.
//
// Scope: only text/HTML under dist. Machine-read channels stay plain on purpose —
// security.txt (RFC 9116) and any JSON/JSON-LD are NOT touched (we skip <script>/<style>
// so structured data isn't corrupted, and this script never reads non-HTML files).
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, process.argv[2] || "dist");

// Encode every character as a decimal HTML entity — deterministic (reproducible builds).
const enc = (s) => [...s].map((c) => `&#${c.codePointAt(0)};`).join("");
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const SKIP = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi; // never touch script/style (JSON-LD!)

// Obfuscate emails outside any <script>/<style> block.
function obfuscate(html) {
  let out = "", last = 0, m, n = 0;
  const count = (s) => s.replace(EMAIL, (e) => { n++; return enc(e); });
  SKIP.lastIndex = 0;
  while ((m = SKIP.exec(html))) {
    out += count(html.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  out += count(html.slice(last));
  return { out, n };
}

async function walk(dir) {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) files.push(...await walk(abs));
    else if (e.name.endsWith(".html")) files.push(abs);
  }
  return files;
}

let total = 0, touched = 0;
for (const file of await walk(dist)) {
  const html = await readFile(file, "utf8");
  const { out, n } = obfuscate(html);
  if (n > 0 && out !== html) { await writeFile(file, out); total += n; touched++; }
}
console.log(`✓ obfuscate-email: entity-encoded ${total} address(es) across ${touched} HTML file(s) (no JS)`);
