#!/usr/bin/env node
// verify-vendor — fail-closed integrity check of the vendored conformance-kit.
//
//   node scripts/verify-vendor.mjs
//
// Re-hashes every file under vendor/conformance-kit/ and compares it to the
// sha256 pins recorded in vendor/conformance-kit.lock.json (written when the kit
// was vendored at its pinned commit). Any added, removed, or modified file is a
// violation (exit 1) — so a tampered or drifted vendored copy can never be used
// by the build or the gates. Run before every use (CI + deploy).
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const VENDOR = join(root, "vendor", "conformance-kit");
const LOCK = join(root, "vendor", "conformance-kit.lock.json");

// Ephemeral / generated paths the vendored copy's own .gitignore excludes — these
// are never part of the hash-pin (the lock covers the kit's SOURCE files only).
const IGNORE_FILES = new Set(["deno.lock", ".DS_Store"]);
const ignored = (rel) =>
  rel.split("/").includes("node_modules") ||
  rel.startsWith("test/.work/") ||
  IGNORE_FILES.has(rel.split("/").pop()) ||
  rel.endsWith(".log");

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (ignored(relative(VENDOR, abs))) continue;
    if (e.isDirectory()) out.push(...await walk(abs));
    else out.push(abs);
  }
  return out;
}

const lock = JSON.parse(await readFile(LOCK, "utf8"));
const pinned = lock.files || {};
const errors = [];

const present = (await walk(VENDOR)).map((f) => relative(VENDOR, f)).sort();
const presentSet = new Set(present);
const pinnedSet = new Set(Object.keys(pinned));

for (const rel of present) {
  if (!pinnedSet.has(rel)) { errors.push(`unpinned file present: ${rel}`); continue; }
  const actual = "sha256:" + createHash("sha256").update(await readFile(join(VENDOR, rel))).digest("hex");
  if (actual !== pinned[rel]) errors.push(`hash mismatch: ${rel}\n      pinned ${pinned[rel]}\n      actual ${actual}`);
}
for (const rel of pinnedSet) {
  if (!presentSet.has(rel)) errors.push(`pinned file missing: ${rel}`);
}

if (errors.length) {
  console.error(`✗ verify-vendor: ${errors.length} integrity violation(s) in vendor/conformance-kit/:`);
  for (const e of errors) console.error(`    ${e}`);
  console.error(`  Re-vendor from ${lock.source} @ ${lock.commit} and regenerate the lock.`);
  process.exit(1);
}
console.log(`✓ verify-vendor: vendor/conformance-kit/ matches the hash-pin (${present.length} files @ ${lock.commit.slice(0, 12)}…)`);
