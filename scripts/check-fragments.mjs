#!/usr/bin/env node
// Fragment-resolution proof — every internal link that names a fragment lands on
// an id that actually exists on the target page. FAILS CLOSED on any `#fragment`
// (same-page or cross-page) that names no id there. Hermetic: reads the built
// dist only, no network.
//
//   node scripts/check-fragments.mjs [distDir]   # default: dist
//
// Why this gate exists: the other internal-link gates are fragment-blind by
// construction — the structure-audit and check-link-graph both strip the
// fragment (`href.split("#")[0]`) before resolving, so a link to a renamed or
// deleted section id still counts as "resolves". That is exactly how the site
// shipped dozens of links to `#build-provenance`, `#honesty`, `#proof` and
// `#bet` — ids from older homepage generations — with every gate green. A
// fragment link that silently lands at the top of the page is a broken promise
// to the reader; this gate makes that promise checkable.
//
// Scope: `id="…"` attributes are the anchor surface (this site's HTML uses no
// legacy <a name> anchors — that is asserted below, so the assumption fails
// closed too). External URLs (https:, mailto:, …) are out of scope, as are
// fragments on non-HTML targets (there is nothing to resolve them against).
import { readdir, readFile } from "node:fs/promises";
import { join, relative, dirname as pdir, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(pdir(fileURLToPath(import.meta.url)), "..");
const dist = join(root, process.argv[2] || "dist");

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(abs));
    else out.push(abs);
  }
  return out;
}

const pages = new Set(
  (await walk(dist)).filter((f) => f.endsWith(".html")).map((f) => relative(dist, f)),
);

// Resolve an href's PATH half to a served HTML page key (same rules as
// check-link-graph), or null for off-graph targets. A bare "#frag" resolves to
// the linking page itself.
function resolvePage(href, fromPage) {
  if (/^(https?:|mailto:|tel:|data:)/i.test(href)) return null;
  if (href.startsWith("#")) return fromPage;
  let p = href.split("#")[0].split("?")[0];
  if (!p) return fromPage; // "?query#frag" — still this page
  if (p.startsWith("/")) {
    p = p.replace(/^\//, "");
  } else {
    p = normalize(join(pdir(fromPage), p)); // relative to the linking page
  }
  if (p === "" || p.endsWith("/")) p += "index.html";
  for (const cand of [p, `${p}.html`, `${p}/index.html`]) {
    if (pages.has(cand)) return cand;
  }
  return null;
}

// id inventory per page — the set every fragment must resolve into.
const ids = {};
for (const page of pages) {
  const html = await readFile(join(dist, page), "utf8");
  if (/<a\s[^>]*\bname="/i.test(html)) {
    console.error(`✗ check-fragments: ${page} uses a legacy <a name> anchor — this gate only reads id= and would miss it`);
    process.exit(1);
  }
  ids[page] = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
}

const dead = []; // { page, href, target, frag }
for (const page of pages) {
  const html = await readFile(join(dist, page), "utf8");
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const href = m[1].replace(/&amp;/g, "&");
    const hash = href.indexOf("#");
    if (hash === -1) continue;
    const frag = decodeURIComponent(href.slice(hash + 1));
    if (!frag) continue; // href="#" / trailing "#" — page top, always valid
    const target = resolvePage(href, page);
    if (!target) continue; // external or non-HTML target — out of scope
    if (!ids[target].has(frag)) dead.push({ page, href, target, frag });
  }
}

if (dead.length) {
  console.error(`✗ check-fragments: ${dead.length} fragment link(s) name no id on their target page:`);
  for (const d of dead) {
    console.error(`    ${d.page}: href="${d.href}" → ${d.target} has no id="${d.frag}"`);
  }
  process.exit(1);
}
console.log(
  `✓ check-fragments: every internal fragment link on ${pages.size} page(s) resolves to a real id`,
);
