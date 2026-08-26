#!/usr/bin/env node
// Keep data/registry.json in sync with what each package declares about itself.
//
//   node scripts/gen-registry.mjs --check          validate the seed (offline)
//   node scripts/gen-registry.mjs --from-bounded   refresh labels from each package's bounded.* (network)
//
// This script used to ALSO render a summary of the registry into index.html. It
// no longer renders anything. The homepage was cut down to what a first-time
// reader needs (site issue 219), and the registry it used to summarise is
// rendered in full by gen-map.mjs on /map — where the same numbers already
// appear as tiles. Two renderers for one dataset is the drift this project
// exists to argue against, so the second one is gone rather than retargeted.
//
// Canonical labels live in each package's package.json `bounded.{kind,facet,role,domain}`;
// `--from-bounded` is the networked cutover that refreshes the seed from them, and
// /map is where the result becomes a page.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(root, "data", "registry.json");

const args = new Set(process.argv.slice(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const id = (s) => s.replace(/[^a-zA-Z0-9]/g, "_");

const loadData = async () => JSON.parse(await readFile(DATA, "utf8"));
const writeData = async (d) => writeFile(DATA, JSON.stringify(d, null, 2) + "\n");

// --- networked: pull labels from each package's bounded.* -------------------
async function rawJson(repo, path) {
  const res = await fetch(`https://raw.githubusercontent.com/${repo}/main/${path}`, {
    headers: { "User-Agent": "bounded-tools-gen-registry" },
  });
  return res.ok ? res.json().catch(() => null) : null;
}
const repoOf = (name) =>
  name === "prx-config"
    ? { repo: "bounded-systems/prx", path: "packages/prx-config/package.json" }
    : { repo: `bounded-systems/${name}`, path: "package.json" };

async function refreshFromBounded(data) {
  if (typeof fetch !== "function") {
    console.error("✗ global fetch unavailable — Node 18+ required for --from-bounded");
    process.exit(2);
  }
  let sourced = 0, changed = 0;
  for (const n of data.nodes) {
    const { repo, path } = repoOf(n.name);
    const pkg = await rawJson(repo, path).catch(() => null);
    const b = pkg && pkg.bounded;
    if (b && b.facet && b.role && b.domain) {
      sourced++;
      for (const k of ["kind", "facet", "role", "domain", "tagline"]) {
        if (b[k] && b[k] !== n[k]) {
          console.log(`  ↑ ${n.name}.${k}: "${n[k]}" → "${b[k]}"`);
          n[k] = b[k];
          changed++;
        }
      }
    } else {
      console.warn(`  · ${n.name}: no bounded.{facet,role,domain} upstream yet — keeping seed`);
    }
  }
  await writeData(data);
  console.log(`✓ refreshed from packages: ${sourced}/${data.nodes.length} sourced upstream, ${changed} field(s) changed`);
  return data;
}

// --- main -------------------------------------------------------------------
const data = await loadData();

if (args.has("--from-bounded")) {
  await refreshFromBounded(data);
  console.log("  → run `node scripts/gen-map.mjs` to re-render /map from the refreshed seed.");
  process.exit(0);
}

// Offline validation: the seed is the source /map renders from, so a malformed
// entry here is a broken page there. Checked as data, not as rendered markup —
// gen-map.mjs --check owns the rendering half.
const REQUIRED = ["name", "pkg", "kind", "facet", "role", "domain", "tagline"];
let bad = 0;
for (const n of data.nodes) {
  const missing = REQUIRED.filter((k) => !n[k]);
  if (missing.length) { console.error(`✗ ${n.name || "(unnamed node)"}: missing ${missing.join(", ")}`); bad++; }
  if (n.facet && !["verb", "noun"].includes(n.facet)) { console.error(`✗ ${n.name}: facet "${n.facet}" is neither verb nor noun`); bad++; }
}
const names = new Set(data.nodes.map((n) => n.name));
for (const e of data.edges) {
  for (const side of ["from", "to"]) {
    if (!names.has(e[side])) { console.error(`✗ edge ${e.from} → ${e.to}: "${e[side]}" is not a node`); bad++; }
  }
}
if (bad) {
  console.error(`✗ gen-registry: ${bad} problem(s) in data/registry.json`);
  process.exit(1);
}
console.log(`✓ registry seed valid — ${data.nodes.length} node(s), ${data.edges.length} edge(s); /map renders it (gen-map.mjs --check)`);
