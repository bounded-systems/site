#!/usr/bin/env node
// Assemble the static site into dist/.
// Copies the page + the consumed brand assets, so dist/ is self-contained and
// deployable to any static host (GitHub Pages, Cloudflare Pages, Netlify).
import { rm, mkdir, cp, access, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const brand = join(root, "brand");

async function exists(p) { try { await access(p); return true; } catch { return false; } }

if (!(await exists(join(brand, "tokens", "tokens.css")))) {
  console.error("✗ brand/ is empty. Run: git submodule update --init --recursive");
  process.exit(1);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

// Page files
for (const f of ["index.html", "styles.css", "404.html", "llms.txt", "nav.js"]) {
  await cp(join(root, f), join(dist, f));
}

// Only the brand assets the site actually references
await mkdir(join(dist, "brand"), { recursive: true });
for (const p of ["tokens/tokens.css", "css", "mark", "favicon-32.png", "lockup"]) {
  await cp(join(brand, p), join(dist, "brand", p), { recursive: true });
}

// Nav: render from the canonical JSON-LD source (data/nav.jsonld) so the
// primary site nav is identical on every page and the section list can't drift.
// site[] = separate pages/external (the <nav aria-label="Main"> landmark);
// sections[] = in-page anchors (the home-only <nav aria-label="On this page">).
const nav = JSON.parse(await readFile(join(root, "data", "nav.jsonld"), "utf8"));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const renderSite = (items) => items.map((i) =>
  i.kind === "external"
    ? `<a class="nav__gh" href="${i.url}" rel="noopener">${esc(i.name)}&nbsp;&#8599;</a>`
    : `<a href="${i.url}">${esc(i.name)}</a>`
).join("\n          ");
const renderToc = (items) =>
  items.map((i) => `<a href="${i.url}">${esc(i.name)}</a>`).join("\n            ");
const siteHtml = renderSite(nav.site);
const tocHtml = renderToc(nav.sections);
for (const f of ["index.html", "404.html"]) {
  const p = join(dist, f);
  const html = await readFile(p, "utf8");
  await writeFile(
    p,
    html.replace("<!--SITE-NAV-->", siteHtml).replace("<!--DOC-TOC-->", tocHtml),
  );
}

console.log("✓ built dist/  (deploy this folder)");
