#!/usr/bin/env node
// Generate the atlas in map.html from data/registry.json + data/lattice.json.
//
//   node scripts/gen-map.mjs           rewrite the marked region in map.html
//   node scripts/gen-map.mjs --check   exit 1 if the region is stale (no writes)
//
// Same shape as gen-contracts/gen-ledger: the block between `<!-- map:start … -->`
// and `<!-- map:end -->` is GENERATED — do not hand-edit. Hermetic, committed
// data, no network.
//
// WHY THIS PAGE EXISTS (site#205/#206). The org builds a lot and the tools don't
// surface themselves: the semantic layer — what each package IS (verb/noun),
// WHAT KIND of thing (guest/room/door), its role, its one-line why — already
// lives in data/registry.json, seeded from each package's own bounded.* labels,
// but was rendered only as an unlinked grid mid-homepage. This page is the
// learning layer: stand on it to see what exists and why.
//
// HONESTY RULES THIS FILE KEEPS:
//  - Coverage is stated, not implied: the registry maps the published packages,
//    not all repos in the org. The tiles say "26 mapped · 72 repos in the org",
//    and the shortfall is descriptor adoption (org work), not this page's.
//  - No per-node external links in v1. The registry seed carries no `url` field,
//    and this environment cannot verify guessed ones — a fabricated link would
//    break the site's own rule that every link points at something real.
//    Verified links land via the registry's --from-bounded path, not guesses.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = join(root, "map.html");
const REGISTRY = join(root, "data", "registry.json");
const LATTICE = join(root, "data", "lattice.json");
const START = "<!-- map:start";
const END = "<!-- map:end -->";

const args = new Set(process.argv.slice(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const registry = JSON.parse(await readFile(REGISTRY, "utf8"));
const lattice = JSON.parse(await readFile(LATTICE, "utf8"));
const nodes = registry.nodes || [];
const edges = registry.edges || [];

// name -> the nodes it uses (declared dependency edges within the registry)
const uses = new Map();
for (const e of edges) {
  if (!uses.has(e.from)) uses.set(e.from, []);
  uses.get(e.from).push(e.to);
}

const KINDS = ["door", "room", "guest"]; // doors first: the unit of bounded authority
const kindRank = (k) => { const i = KINDS.indexOf(k); return i === -1 ? KINDS.length : i; };

function renderTiles() {
  const tile = (n, l) => `      <div class="tile"><div class="tile__n">${n}</div><div class="tile__l">${esc(l)}</div></div>`;
  const verbs = nodes.filter((n) => n.facet === "verb").length;
  const nouns = nodes.filter((n) => n.facet === "noun").length;
  return [
    '      <div class="atlas__tiles">',
    tile(nodes.length, "packages mapped"),
    tile(lattice.summary?.nodes ?? "?", "repos in the org"),
    tile(verbs, "verbs (act)"),
    tile(nouns, "nouns (hold)"),
    "      </div>",
    '      <p class="atlas__intro muted">Coverage is honest, not complete: these are the published packages that declare',
    "      their own labels. The rest of the org's repos appear here as their descriptors land.</p>",
  ].join("\n");
}

function renderNode(n) {
  const used = uses.get(n.name) || [];
  return [
    '      <div class="node">',
    '        <div class="node__head">',
    `          <span class="node__name">${esc(n.name)}</span>`,
    `          <span class="badge badge--${esc(n.kind)}">${esc(n.kind)}</span>`,
    `          <span class="tag">${esc(n.role)}</span>`,
    `          <span class="tag">${esc(n.domain)}</span>`,
    "        </div>",
    `        <p class="node__desc">${esc(n.tagline)}</p>`,
    used.length ? `        <p class="node__uses">uses &rarr; ${used.map(esc).join(", ")}</p>` : "",
    "      </div>",
  ].filter(Boolean).join("\n");
}

function renderFacet(facet, title, blurb) {
  const list = nodes
    .filter((n) => n.facet === facet)
    .sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || a.name.localeCompare(b.name));
  return [
    `      <h2>${esc(title)}</h2>`,
    `      <p class="atlas__intro muted">${blurb}</p>`,
    ...list.map(renderNode),
  ].join("\n");
}

function renderSection() {
  return [
    renderTiles(),
    renderFacet("verb", "Verbs — the things that act",
      "Every one of these is a sanctioned access point: the single place a kind of effect is allowed to happen."),
    renderFacet("noun", "Nouns — the things that hold",
      "The data the verbs run on: storage, schemas, chains, context."),
  ].join("\n");
}

function splice(html, body) {
  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s === -1 || e === -1) throw new Error("map markers not found in map.html — add <!-- map:start … --> / <!-- map:end -->");
  const afterStart = html.indexOf("-->", s) + 3;
  return `${html.slice(0, afterStart)}\n${body}\n`.concat(html.slice(e));
}

const html = await readFile(HTML, "utf8");
const next = splice(html, renderSection());

if (args.has("--check")) {
  if (next !== html) {
    console.error("✗ map section in map.html is stale — run: node scripts/gen-map.mjs");
    process.exit(1);
  }
  console.log(`✓ map section is in sync (${nodes.length} nodes, ${edges.length} edges)`);
  process.exit(0);
}

if (next !== html) {
  await writeFile(HTML, next);
  console.log(`✓ regenerated map section in map.html (${nodes.length} nodes)`);
} else {
  console.log("✓ map section already up to date");
}
