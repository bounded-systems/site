#!/usr/bin/env node
// Assemble the static site into dist/.
// Copies the page + the consumed brand assets, so dist/ is self-contained and
// deployable to any static host (GitHub Pages, Cloudflare Pages, Netlify).
import { rm, mkdir, cp, access } from "node:fs/promises";
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
for (const f of ["index.html", "styles.css", "404.html", "llms.txt"]) {
  await cp(join(root, f), join(dist, f));
}

// Only the brand assets the site actually references
await mkdir(join(dist, "brand"), { recursive: true });
for (const p of ["tokens/tokens.css", "css", "mark", "favicon-32.png", "lockup"]) {
  await cp(join(brand, p), join(dist, "brand", p), { recursive: true });
}

console.log("✓ built dist/  (deploy this folder)");
