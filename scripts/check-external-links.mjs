#!/usr/bin/env node
// External-link liveness check — extracts every external https link from the BUILT
// pages and probes each for a live (< 400) response, following redirects. A dead
// link exits 1.
//
//   node scripts/check-external-links.mjs [distDir]   # default: dist
//
// DELIBERATELY NOT a build gate: liveness depends on the public internet, which is
// neither hermetic nor reproducible, so wiring it into the build/deploy would make
// a green build hostage to someone else's outage. It runs on a SCHEDULE
// (link-check.yml) — a monitor that catches link rot, the sibling of rekor-monitor.
// Internal links are already gated, hermetically, by the structure-audit.
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function dirname(p) { return p.replace(/\/[^/]*$/, ""); }

const dist = join(root, process.argv[2] || "dist");

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(abs));
    else if (e.name.endsWith(".html")) out.push(abs);
  }
  return out;
}

// rel → Set of external links found on it (for reporting where a dead link lives)
const where = new Map();
for (const abs of await walk(dist)) {
  const html = await readFile(abs, "utf8");
  const rel = relative(dist, abs);
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const u = m[1].replace(/&amp;/g, "&");
    if (!where.has(u)) where.set(u, new Set());
    where.get(u).add(rel);
  }
}

const links = [...where.keys()].sort();
console.log(`check-external-links: probing ${links.length} distinct external link(s) over the built site\n`);

async function probe(u) {
  const opts = { redirect: "follow", headers: { "user-agent": "bounded.tools-link-check" } };
  try {
    let r = await fetch(u, { method: "HEAD", ...opts });
    if (r.status >= 400) r = await fetch(u, { method: "GET", ...opts }); // some hosts reject HEAD
    return r.status;
  } catch (e) {
    return `ERR ${String(e.message || e).slice(0, 40)}`;
  }
}

const dead = [];
// modest concurrency to be polite
const queue = [...links];
async function worker() {
  while (queue.length) {
    const u = queue.shift();
    const status = await probe(u);
    const ok = typeof status === "number" && status < 400;
    console.log(`${ok ? "ok " : "BAD"} ${String(status).padEnd(6)} ${u}`);
    if (!ok) dead.push({ u, status, on: [...where.get(u)].sort() });
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

if (dead.length) {
  console.error(`\n✗ check-external-links: ${dead.length} dead link(s):`);
  for (const d of dead) console.error(`    ${d.status}  ${d.u}\n      on: ${d.on.join(", ")}`);
  process.exit(1);
}
console.log(`\n✓ check-external-links: all ${links.length} external link(s) live.`);
