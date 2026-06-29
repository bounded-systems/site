#!/usr/bin/env node
// gen-strings — single-source micro-copy. content/strings.json is the ONE source of
// copy; HTML elements opt in with data-str="key" and the build fills their text from it.
//
//   node scripts/gen-strings.mjs          # inject strings.json → the HTML (strings.json wins)
//   node scripts/gen-strings.mjs --check  # string-audit: fail on drift / unknown key / unused key
//
// This is the copy analogue of the design tokens: one source, projected to many surfaces,
// drift caught as a build failure. A data-str element's text can't silently diverge from
// content/strings.json, and every catalogued string must actually be used on a surface.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Copy resolves the same way the brand's content.mjs merges it: the CORE strings (the
// brand submodule — name/tagline/…) plus this surface's strings.json, which EXTENDS core.
// So data-str can reference a core token (e.g. the org name) as well as a site string.
const site = JSON.parse(readFileSync(join(root, "content/strings.json"), "utf8"));
let core = {};
try { core = JSON.parse(readFileSync(join(root, "brand/content/strings.json"), "utf8")); } catch { /* core optional */ }
const strings = { ...core, ...site };
const siteKeys = new Set(Object.keys(site).filter((k) => !k.startsWith("$"))); // core keys belong to the brand — not unused-checked here
const SURFACES = ["index.html"]; // HTML surfaces whose data-str copy is single-sourced
const check = process.argv.includes("--check");

// data-str carries PLAIN text (headings, titles, labels, CTAs). The element body must be
// a single text run — no nested tags — so the copy stays projectable to CommonMark.
const DATA_STR = /(<([a-z0-9]+)\b[^>]*\bdata-str="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/gi;
const used = new Set();
let drift = 0, unknown = 0, nested = 0;

for (const file of SURFACES) {
  const path = join(root, file);
  const html = readFileSync(path, "utf8");
  const out = html.replace(DATA_STR, (m, open, tag, key, body, close) => {
    const entry = strings[key];
    if (!entry) { console.error(`✗ ${file}: data-str="${key}" — no such key in content/strings.json`); unknown++; return m; }
    used.add(key);
    if (/<[a-z]/i.test(body)) { console.error(`✗ ${file}: data-str="${key}" wraps nested markup — data-str is for a single text run`); nested++; return m; }
    const want = entry.$value;
    if (body !== want) {
      if (check) { console.error(`✗ ${file}: data-str="${key}" drift\n     html:    ${JSON.stringify(body.slice(0, 60))}\n     strings: ${JSON.stringify(want.slice(0, 60))}`); drift++; return m; }
      return open + want + close; // inject — strings.json is canonical
    }
    return m;
  });
  if (!check && out !== html) writeFileSync(path, out);
}

// Every catalogued string should be referenced from a surface (no dead copy). Tags/claims
// consumed elsewhere (the audit catalog) are exempt via a $usage: "catalog" marker.
const unused = [...siteKeys].filter((k) => !used.has(k) && strings[k].$usage !== "catalog");

if (check) {
  const problems = drift + unknown + nested;
  if (problems) { console.error(`✗ string-audit: ${drift} drift · ${unknown} unknown key · ${nested} nested — fix or run: node scripts/gen-strings.mjs`); process.exit(1); }
  console.log(`✓ string-audit — ${used.size} data-str element(s) match content/strings.json (${unused.length} catalogued not-yet-wired)`);
} else {
  console.log(`✓ gen-strings — injected ${used.size} single-sourced string(s) into ${SURFACES.length} surface(s)`);
}
