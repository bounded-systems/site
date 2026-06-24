#!/usr/bin/env node
// SEO/meta drift gate for the hand-authored home page (index.html).
//
//   node scripts/check-seo.mjs    # exit 1 if a required meta tag is missing
//
// Blog pages are generated (gen-blog.mjs) and consistent by construction; the one
// ungated surface is index.html, whose <title>/description/OG/canonical are kept
// by hand. This asserts they stay present and well-formed. Missing required tags
// are errors (fail CI); length budgets are warnings (printed, non-fatal) — same
// error/warn split the copy gate uses.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = await readFile(join(root, "index.html"), "utf8");

const errors = [];
const warns = [];
const attr = (re) => (html.match(re)?.[1] ?? "").trim();
const present = (re) => re.test(html);

// --- required presence (errors) ---
const title = attr(/<title>([^<]*)<\/title>/i);
if (!title) errors.push("<title> is missing or empty");

const desc = attr(/<meta\s+name="description"\s+content="([^"]*)"/i);
if (!desc) errors.push('<meta name="description"> is missing');

if (!present(/<link\s+rel="canonical"\s+href="[^"]+"/i)) errors.push('<link rel="canonical"> is missing');

for (const p of ["og:type", "og:title", "og:description", "og:image", "og:url", "og:image:alt"]) {
  if (!new RegExp(`<meta\\s+property="${p}"\\s+content="[^"]+"`, "i").test(html))
    errors.push(`<meta property="${p}"> is missing`);
}
if (!present(/<meta\s+name="twitter:card"\s+content="[^"]+"/i)) errors.push('<meta name="twitter:card"> is missing');

const h1s = (html.match(/<h1[\s>]/gi) || []).length;
if (h1s === 0) errors.push("no <h1> on the page");
else if (h1s > 1) errors.push(`${h1s} <h1> elements — there should be exactly one`);

// --- soft budgets (warnings) ---
if (title && title.length > 65) warns.push(`<title> is ${title.length} chars (>65 may truncate in search results)`);
if (desc && (desc.length < 50 || desc.length > 160)) warns.push(`meta description is ${desc.length} chars (aim for 50–160)`);

for (const w of warns) console.log(`  ⚠ seo: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ✗ seo: ${e}`);
  console.error(`✗ check-seo — ${errors.length} error(s) in index.html`);
  process.exit(1);
}
console.log(`seo:check — index.html ok (${warns.length} warning(s))`);
