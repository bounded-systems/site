#!/usr/bin/env node
// Generate dist/sitemap.xml + dist/robots.txt from the site's pages.
//
//   node scripts/gen-sitemap.mjs    # write dist/sitemap.xml + dist/robots.txt
//
// Deterministic + dependency-free: enumerates blog/*.md for post URLs, plus the
// home page and blog index. Output lives in dist/ (a pure build artifact, like
// gen-blog.mjs) — nothing committed to drift-check. Wired into the hermetic build
// (flake buildPhase) so the deployed site actually carries them.
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const SITE = "https://bounded.tools";

let posts = [];
try { posts = (await readdir(join(root, "blog"))).filter((f) => f.endsWith(".md")).sort(); }
catch { /* no blog/ */ }

// Served files (guaranteed 200): home, every nav page, blog index, each post at
// /blog/<slug>.html.
//
// DERIVED, NOT RESTATED (#203). This list used to be hand-maintained, and
// /contracts went missing from it for its whole life (#201) because shipping a
// page and listing it here were two separate acts of memory — the drift shape
// data/nav.jsonld already exists to prevent for the nav itself ("so the two never
// drift", build.mjs). Pages now come from that same canonical source: a page a
// reader can reach from the nav is exactly a page a crawler should find. One
// list, two consumers.
//
// `kind: "external"` entries are excluded by construction, and that is correct —
// a sitemap advertises THIS origin, not GitHub. `/` is not a nav item (the mark
// links home) so it stays explicit, and posts already derive from blog/*.md.
const nav = JSON.parse(await readFile(join(root, "data", "nav.jsonld"), "utf8"));
const navPages = (nav.site || []).filter((i) => i.kind === "page").map((i) => `${SITE}${i.url}`);

// Deduped, order-preserving: the sources legitimately overlap — nav carries
// "Writing" (/blog/) as a page, and the blog index is listed here in its own
// right so it survives being dropped from the nav. A URL repeated in a sitemap
// is not fatal, but it is the kind of sloppiness this repo gates elsewhere
// (check-node-uniqueness), and a Set makes any future overlap a non-event.
const urls = [...new Set([
  `${SITE}/`,
  ...navPages,
  `${SITE}/blog/`,
  ...posts.map((f) => `${SITE}/blog/${basename(f, ".md")}.html`),
])];

const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
  `\n</urlset>\n`;

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;

await mkdir(dist, { recursive: true });
await writeFile(join(dist, "sitemap.xml"), sitemap);
await writeFile(join(dist, "robots.txt"), robots);
console.log(`✓ sitemap: ${urls.length} URLs → dist/sitemap.xml + dist/robots.txt`);
