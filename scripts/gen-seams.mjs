#!/usr/bin/env node
// Generate the capability-seam grid on the homepage from data/seams.json.
//
// The grid between the `<!-- seams:start … -->` and `<!-- seams:end -->`
// markers in index.html is GENERATED — do not hand-edit it. Edit the seed
// (data/seams.json) and run this script.
//
//   node scripts/gen-seams.mjs              rewrite the marked region in index.html
//   node scripts/gen-seams.mjs --check      exit 1 if the region is stale (no writes, offline)
//   node scripts/gen-seams.mjs --emit-seed  write seed/prx-seam-taglines.json (upstream payload)
//   node scripts/gen-seams.mjs --reconcile  cross-check the seam SET against prx (needs network)
//   node scripts/gen-seams.mjs --reconcile --write   reconcile and rewrite index.html
//
// Source of truth: today the taglines live in data/seams.json, seeded from the
// original hand-written copy. The canonical home is each prx package's
// package.json — `--emit-seed` produces the payload to promote them upstream,
// after which the source can flip to prx without changing the rendered output.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = join(root, "index.html");
const DATA = join(root, "data", "seams.json");
const START = "<!-- seams:start";
const END = "<!-- seams:end -->";

const args = new Set(process.argv.slice(2));
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function loadData() {
  return JSON.parse(await readFile(DATA, "utf8"));
}

function renderGrid(seams) {
  const rows = seams.map(
    (s) =>
      `        <div class="seam"><div class="seam__name">${esc(s.name)}</div><div class="seam__desc">${esc(s.tagline)}</div></div>`,
  );
  return ['      <div class="seam-grid">', ...rows, "      </div>"].join("\n");
}

// Replace everything between the start-marker's `-->` and the end marker.
function splice(html, grid) {
  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s === -1 || e === -1) {
    throw new Error("seam markers not found in index.html — add <!-- seams:start … --> / <!-- seams:end -->");
  }
  const afterStart = html.indexOf("-->", s) + 3;
  return `${html.slice(0, afterStart)}\n${grid}\n      ${html.slice(e)}`;
}

// --- prx reconciliation (networked) -----------------------------------------
async function ghJson(url) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "bounded-tools-gen-seams",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function rawJson(repo, path) {
  const res = await fetch(`https://raw.githubusercontent.com/${repo}/main/${path}`, {
    headers: { "User-Agent": "bounded-tools-gen-seams" },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

// Returns the set of seam package short-names declared in prx
// (packages/*/package.json whose `keywords` include the seam keyword).
async function prxSeams({ repo, packagesDir, seamKeyword }) {
  const entries = await ghJson(`https://api.github.com/repos/${repo}/contents/${packagesDir}`);
  const dirs = entries.filter((e) => e.type === "dir").map((e) => e.name);
  const found = [];
  for (const name of dirs) {
    const pkg = await rawJson(repo, `${packagesDir}/${name}/package.json`);
    if (pkg && Array.isArray(pkg.keywords) && pkg.keywords.includes(seamKeyword)) {
      found.push({ name, pkg: pkg.name, description: pkg.description ?? "" });
    }
  }
  return found;
}

async function reconcile(data) {
  const src = data.source;
  if (typeof fetch !== "function") {
    console.error("✗ global fetch unavailable — Node 18+ required for --reconcile");
    process.exit(2);
  }
  let prx;
  try {
    prx = await prxSeams(src);
  } catch (err) {
    console.error(`✗ could not read prx seam set: ${err.message}`);
    process.exit(2);
  }
  const onSite = new Set(data.seams.map((s) => s.name));
  const inPrx = new Set(prx.map((s) => s.name));

  const dropped = [...onSite].filter((n) => !inPrx.has(n)); // shown but gone from prx → breakage
  const added = prx.filter((s) => !onSite.has(s.name)); // new prx seam not yet curated → todo

  for (const s of added) {
    console.warn(`  + prx has ${s.pkg} (keyword:${src.seamKeyword}) — not on the site yet`);
  }
  for (const n of dropped) {
    console.error(`  - site shows "${n}" but no keyword:${src.seamKeyword} package for it in prx`);
  }
  if (dropped.length) {
    console.error(`✗ ${dropped.length} seam(s) on the site no longer exist in prx — fix data/seams.json`);
    process.exit(1);
  }
  if (!added.length) console.log("✓ seam set matches prx");
  return { prx, added, dropped };
}

// --- upstream seed ----------------------------------------------------------
async function emitSeed(data) {
  const payload = {
    _comment:
      "Promote into each prx package.json as `bounded.tagline` so prx becomes the single source of truth for the homepage seam grid.",
    taglines: Object.fromEntries(
      data.seams.map((s) => [`${data.source.scope}/${s.name}`, s.tagline]),
    ),
  };
  await mkdir(join(root, "seed"), { recursive: true });
  const out = join(root, "seed", "prx-seam-taglines.json");
  await writeFile(out, JSON.stringify(payload, null, 2) + "\n");
  console.log(`✓ wrote ${out}`);
}

// --- main -------------------------------------------------------------------
const data = await loadData();
const html = await readFile(HTML, "utf8");
const next = splice(html, renderGrid(data.seams));

// Read-only drift gate (offline, deterministic) — used by CI.
if (args.has("--check")) {
  if (next !== html) {
    console.error("✗ seam grid in index.html is stale — run: node scripts/gen-seams.mjs");
    process.exit(1);
  }
  console.log("✓ seam grid is in sync with data/seams.json");
  process.exit(0);
}

// Render (idempotent) unless this is a pure report.
if (!args.has("--reconcile")) {
  if (next !== html) {
    await writeFile(HTML, next);
    console.log("✓ regenerated seam grid in index.html");
  } else {
    console.log("✓ seam grid already up to date");
  }
}

if (args.has("--emit-seed")) await emitSeed(data);

// Networked cross-check against prx. Report-only; run last so its exit code
// (1 = a shown seam vanished from prx, 2 = could not reach prx) is the result.
if (args.has("--reconcile")) await reconcile(data);

