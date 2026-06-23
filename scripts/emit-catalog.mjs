#!/usr/bin/env node
// Emit a deterministic, content-addressed content catalog from the site's prose
// surfaces, for the upstream string-audit reusable gate (audit.yml@v0.6.1).
//
//   node scripts/emit-catalog.mjs           # (re)generate data/audit/catalog.json + grounding.json
//   node scripts/emit-catalog.mjs --check    # verify the committed catalog is current (CI/staleness gate)
//
// Why this exists
// ---------------
// The gate (string-audit/audit-gate.mjs) runs prose checks per catalog symbol.
// Our copy still lives in rendered surfaces (index.html + blog/*.md), not yet as
// typed tokens, so we extract those surfaces into a catalog here. Same surfaces,
// same prose blocks the old vendored scripts/check-copy.mjs scanned — now gated
// upstream, fix-once-propagate, no vendored submodule.
//
// Determinism (sha in → sha out)
// ------------------------------
// Each prose block becomes a symbol keyed by `<surface>#<sha256(block)[:12]>`.
// Keys are content-addressed (editing one block churns only its key) and the
// output is sorted + stably serialized, so identical prose yields a byte-for-byte
// identical catalog. The reusable workflow is pinned to an immutable commit SHA.
//
// Dependency-free: reads source files, hashes, writes JSON. No string-audit import.
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const CHECK = process.argv.includes("--check");

const OUT_DIR = join(root, "data", "audit");
const CATALOG_PATH = join(OUT_DIR, "catalog.json");
const GROUNDING_PATH = join(OUT_DIR, "grounding.json");

// Reduce each surface to its visible prose so the gate sees sentences, not markup.
// (Kept identical to the retired scripts/check-copy.mjs so gating is unchanged.)
const stripHtml = (s) => s
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&middot;/g, " · ")
  .replace(/&rarr;|&#\d+;/g, " ")
  .replace(/[ \t]+/g, " ");
const stripMd = (s) => s.replace(/```[\s\S]*?```/g, " ").replace(/[#>*`_[\]()]/g, " ");

// Surfaces: the home page + every blog post (sorted for stable iteration).
const surfaces = [["index.html", stripHtml]];
for (const f of (await readdir(join(root, "blog"))).filter((f) => f.endsWith(".md")).sort()) {
  surfaces.push([join("blog", f), stripMd]);
}

const catalog = {};
let blockCount = 0;
for (const [rel, strip] of surfaces) {
  const text = strip(await readFile(join(root, rel), "utf8"));
  const blocks = text.split(/\n\s*\n|\.\s+(?=[A-Z])/).map((b) => b.trim()).filter((b) => b.length > 20);
  for (const block of blocks) {
    const sha = createHash("sha256").update(block).digest("hex").slice(0, 12);
    catalog[`${rel}#${sha}`] = {
      "$value": block,
      "$type": "body",
      "$description": `extracted prose — ${rel}`,
    };
    blockCount++;
  }
}

// Stable serialization: sorted keys, 2-space indent, trailing newline.
const sorted = Object.fromEntries(Object.keys(catalog).sort().map((k) => [k, catalog[k]]));
const catalogJson = JSON.stringify(sorted, null, 2) + "\n";
const groundingJson = "[]\n"; // no `claim`-typed symbols → grounding unused, emitted for an explicit, present input

const summary = `emit-catalog — ${blockCount} prose blocks from ${surfaces.length} surface(s) → data/audit/catalog.json`;

if (CHECK) {
  let current = "";
  try { current = await readFile(CATALOG_PATH, "utf8"); } catch { /* missing → drift */ }
  if (current !== catalogJson) {
    console.error("✗ data/audit/catalog.json is stale — run `node scripts/emit-catalog.mjs` and commit.");
    process.exit(1);
  }
  console.log(`✓ ${summary} (current)`);
} else {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(CATALOG_PATH, catalogJson);
  await writeFile(GROUNDING_PATH, groundingJson);
  console.log(`✓ ${summary}`);
}
