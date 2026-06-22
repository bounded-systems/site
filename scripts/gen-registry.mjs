#!/usr/bin/env node
// Generate the @bounded-systems knowledge-graph section on the homepage from
// data/registry.json.
//
// The block between `<!-- registry:start … -->` and `<!-- registry:end -->`
// in index.html is GENERATED — do not hand-edit. Edit the seed
// (data/registry.json) or pull from the packages, then run this script.
//
//   node scripts/gen-registry.mjs               rewrite the marked region in index.html
//   node scripts/gen-registry.mjs --check       exit 1 if the region is stale (no writes, offline)
//   node scripts/gen-registry.mjs --from-bounded refresh labels from each package's bounded.* (network)
//   node scripts/gen-registry.mjs --reconcile    cross-check the node SET against the org (network)
//
// Spec-driven + auditable: the rendered section is a pure function of
// data/registry.json; CI fails on drift (--check). Canonical labels live in
// each package's package.json `bounded.{kind,facet,role,domain}` —
// `--from-bounded` is the networked cutover that refreshes the seed from them.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = join(root, "index.html");
const DATA = join(root, "data", "registry.json");
const START = "<!-- registry:start";
const END = "<!-- registry:end -->";

const args = new Set(process.argv.slice(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const id = (s) => s.replace(/[^a-zA-Z0-9]/g, "_");

const loadData = async () => JSON.parse(await readFile(DATA, "utf8"));
const writeData = async (d) => writeFile(DATA, JSON.stringify(d, null, 2) + "\n");

// --- render -----------------------------------------------------------------
function renderMermaid({ nodes, edges }) {
  const decls = nodes.map((n) => `  ${id(n.name)}["${esc(n.name)} · ${esc(n.role)}"]`);
  const links = edges.map((e) => `  ${id(e.from)} --> ${id(e.to)}`);
  const nouns = nodes.filter((n) => n.facet === "noun").map((n) => id(n.name));
  const verbs = nodes.filter((n) => n.facet === "verb").map((n) => id(n.name));
  return [
    '      <pre class="mermaid" aria-label="dependency graph of the @bounded-systems libraries">',
    "flowchart TD",
    ...decls,
    ...links,
    "  classDef noun fill:#1f6f43,stroke:#2ea043,color:#fff;",
    "  classDef verb fill:#1f4f8f,stroke:#388bfd,color:#fff;",
    `  class ${nouns.join(",")} noun;`,
    `  class ${verbs.join(",")} verb;`,
    "      </pre>",
  ].join("\n");
}

function renderCards(nodes) {
  // grouped: verbs (capabilities) then nouns (data), each a labeled card.
  const card = (n) =>
    `        <div class="seam"><div class="seam__name">${esc(n.name)} <span class="facet facet--${esc(n.facet)}">${esc(n.facet)}</span> <span class="kind">${esc(n.kind)}</span></div><div class="seam__desc">${esc(n.tagline)}</div></div>`;
  const verbs = nodes.filter((n) => n.facet === "verb");
  const nouns = nodes.filter((n) => n.facet === "noun");
  return [
    '      <div class="seam-grid">',
    ...verbs.map(card),
    ...nouns.map(card),
    "      </div>",
  ].join("\n");
}

function renderSection(data) {
  // Cards only on the site — no client-side Mermaid CDN (that would be an
  // unpinned external dep, against the org's pinned/no-ambient-authority
  // posture). The node-edge diagram lives on the GitHub surfaces (the org
  // profile, registry/graph.md) where Markdown renders Mermaid natively.
  // renderMermaid() stays available for build-time SVG prerender later.
  return renderCards(data.nodes);
}

function splice(html, body) {
  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s === -1 || e === -1) {
    throw new Error("registry markers not found in index.html — add <!-- registry:start … --> / <!-- registry:end -->");
  }
  const afterStart = html.indexOf("-->", s) + 3;
  return `${html.slice(0, afterStart)}\n${body}\n      ${html.slice(e)}`;
}

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
if (args.has("--from-bounded")) await refreshFromBounded(data);

const html = await readFile(HTML, "utf8");
const next = splice(html, renderSection(data));

if (args.has("--check")) {
  if (next !== html) {
    console.error("✗ registry section in index.html is stale — run: node scripts/gen-registry.mjs");
    process.exit(1);
  }
  console.log("✓ registry section is in sync with data/registry.json");
  process.exit(0);
}

if (next !== html) {
  await writeFile(HTML, next);
  console.log("✓ regenerated registry section in index.html");
} else {
  console.log("✓ registry section already up to date");
}
