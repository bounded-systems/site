#!/usr/bin/env node
// Emit dist/claims.jsonld — the served, build-dated copy of the honesty-section
// claims graph (integrity/claims/claims.jsonld). The served file is covered by
// the site's content-digest manifest (its `securedBy`), so the graph the page
// links to is the one the build signature attests. @@DATE@@ → build date (date
// granularity, matching gen-stamp, to keep the build reproducible day-to-day).
//
//   node scripts/gen-claims.mjs           # write dist/claims.jsonld
//   node scripts/gen-claims.mjs --check   # validate the source graph only
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(root, "integrity", "claims", "claims.jsonld");
const CHECK = process.argv.includes("--check");

const src = await readFile(SRC, "utf8");
// Validate structure via the same checker CI runs (throws/exits non-zero on bad graph).
execSync(`node ${join(root, "integrity", "claims", "validate-claims.mjs")} ${SRC}`, { stdio: "inherit" });

if (CHECK) process.exit(0);

const date = new Date().toISOString().slice(0, 10);
const out = src.replace(/@@DATE@@/g, date);
await mkdir(join(root, "dist"), { recursive: true });
await writeFile(join(root, "dist", "claims.jsonld"), out);
console.log(`✓ claims: 6 graded claims → dist/claims.jsonld (${date})`);
