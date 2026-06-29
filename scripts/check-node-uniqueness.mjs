#!/usr/bin/env node
// Node-uniqueness gate — the "repeating node" half of source-graph integrity.
//
// check-link-graph.mjs proves the ORPHAN half: every built page is reachable from
// home (no island pages). This proves the other half on the canonical data cuts —
// no REPEATING nodes: each identity key in each node set appears exactly once. Two
// nodes claiming one identity is graph-integrity drift, so it FAILS CLOSED.
//
//   node scripts/check-node-uniqueness.mjs           # fail if any identity key repeats
//   node scripts/check-node-uniqueness.mjs --check    # identical (read-only gate)
//
// Cell: source-graph integrity, NOT pull-shape. The Zod contract (contract/page.ts)
// validates the SHAPE a page may pull from a cut; this validates that the cut's
// nodes have distinct identities. Separate badges — a green check here says nothing
// about pull-shape, and vice versa.
//
// Scope note (named honestly): these cuts are flat node lists with no inter-node
// edges, so "orphan node" (unreachable) is not yet a defined property within them —
// uniqueness is. When a cut gains references between nodes (@id links), extend this
// gate with dangling-reference + reachability passes alongside the uniqueness one.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = async (p) => JSON.parse(await readFile(join(root, p), "utf8"));

// Each rule names a node set (file + selector for the array) and the identity
// keys that must be unique across it.
const RULES = [
  { file: "data/registry.json", select: (d) => d.nodes, keys: ["name", "pkg"], label: "registry node" },
  { file: "data/seams.json", select: (d) => d.seams, keys: ["name"], label: "seam" },
  { file: "data/nav.jsonld", select: (d) => d.site, keys: ["url"], label: "nav site link" },
  { file: "data/nav.jsonld", select: (d) => d.sections, keys: ["url"], label: "nav section link" },
];

let violations = 0;
for (const { file, select, keys, label } of RULES) {
  const nodes = select(await load(file)) ?? [];
  for (const key of keys) {
    const counts = new Map();
    for (const node of nodes) {
      const value = node?.[key];
      if (value === undefined) continue; // a missing key is the contract gate's job, not this one
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const repeats = [...counts].filter(([, c]) => c > 1);
    if (repeats.length) {
      violations++;
      console.log(`✗ ${file} — ${label} ${key} repeats:`);
      for (const [value, c] of repeats) console.log(`    ${key}=${JSON.stringify(value)} ×${c}`);
    } else {
      console.log(`✓ ${file} — ${nodes.length} ${label}(s), ${key} unique`);
    }
  }
}

console.log(`\nnode-uniqueness: ${violations} repeating-key violation(s)`);
process.exit(violations > 0 ? 1 : 0);
