#!/usr/bin/env node
// Generate dist/sitemap.xml + dist/robots.txt from the site's pages.
//
//   node scripts/gen-sitemap.mjs    # write dist/sitemap.xml + dist/robots.txt
//
// Deterministic + dependency-free: enumerates blog/*.md for post URLs, plus the
// home page and blog index. Output lives in dist/ (a pure build artifact, like
// gen-blog.mjs) — nothing committed to drift-check. Wired into the hermetic build
// (flake buildPhase) so the deployed site actually carries them.
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const SITE = "https://bounded.tools";

let posts = [];
try { posts = (await readdir(join(root, "blog"))).filter((f) => f.endsWith(".md")).sort(); }
catch { /* no blog/ */ }

// Served files (guaranteed 200): home, blog index, each post at /blog/<slug>.html.
const urls = [
  `${SITE}/`,
  `${SITE}/blog/`,
  ...posts.map((f) => `${SITE}/blog/${basename(f, ".md")}.html`),
];

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
