#!/usr/bin/env node
// Connected-graph proof — the built site is ONE graph: every served HTML page is
// reachable from the home page by following internal links. Emits dist/sitegraph.json
// (nodes + edges — a queryable site index) and FAILS CLOSED if any page is an
// island. Hermetic: reads the built dist only, no network.
//
//   node scripts/check-link-graph.mjs [distDir]   # default: dist
//
// The structure-audit already proves every internal link RESOLVES (0 dead); this
// proves the stronger property — the link graph is a single connected component
// rooted at the home page (no orphan/island pages), and publishes the graph.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, dirname as pdir, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(pdir(fileURLToPath(import.meta.url)), "..");
const dist = join(root, process.argv[2] || "dist");
const ROOT_PAGE = "index.html";
const EXEMPT = new Set(["404.html"]); // the error page is a legitimate non-linked root

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(abs));
    else out.push(abs);
  }
  return out;
}

const pages = new Set(
  (await walk(dist)).filter((f) => f.endsWith(".html")).map((f) => relative(dist, f)),
);

// Resolve an href found on `fromPage` to a served HTML page key, or null for
// off-graph targets (external, anchors, mailto, or non-HTML sidecars like
// /provenance.json, /sitemap.xml, /rekor, /llms.txt).
function resolvePage(href, fromPage) {
  if (/^(https?:|mailto:|tel:|#|data:)/i.test(href)) return null;
  let p = href.split("#")[0].split("?")[0];
  if (!p) return null;
  if (p.startsWith("/")) {
    p = p.replace(/^\//, "");
  } else {
    p = normalize(join(pdir(fromPage), p)); // relative to the linking page
  }
  if (p === "" || p.endsWith("/")) p += "index.html";
  for (const cand of [p, `${p}.html`, `${p}/index.html`]) {
    if (pages.has(cand)) return cand;
  }
  return null;
}

const edges = {}; // page -> sorted array of linked pages
const adj = {}; // page -> Set
for (const page of pages) {
  const html = await readFile(join(dist, page), "utf8");
  const outs = new Set();
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const t = resolvePage(m[1].replace(/&amp;/g, "&"), page);
    if (t && t !== page) outs.add(t);
  }
  adj[page] = outs;
  edges[page] = [...outs].sort();
}

// BFS from the home page
const reachable = new Set([ROOT_PAGE]);
const queue = [ROOT_PAGE];
while (queue.length) {
  for (const n of adj[queue.shift()] || []) {
    if (!reachable.has(n)) { reachable.add(n); queue.push(n); }
  }
}

const islands = [...pages].filter((p) => !reachable.has(p) && !EXEMPT.has(p)).sort();

const graph = {
  root: ROOT_PAGE,
  generatedFrom: "internal href graph of the built site (scripts/check-link-graph.mjs)",
  pageCount: pages.size,
  reachableFromHome: reachable.size,
  connected: islands.length === 0,
  exempt: [...EXEMPT].sort(),
  unreachableFromHome: islands,
  nodes: [...pages].sort(),
  edges: Object.fromEntries([...pages].sort().map((p) => [p, edges[p]])),
};
await writeFile(join(dist, "sitegraph.json"), JSON.stringify(graph, null, 2) + "\n");

if (islands.length) {
  console.error(
    `✗ check-link-graph: ${islands.length} page(s) unreachable from ${ROOT_PAGE} — the site is not one connected graph:`,
  );
  for (const p of islands) console.error(`    island: ${p}`);
  process.exit(1);
}
console.log(
  `✓ check-link-graph: ${pages.size} HTML page(s) form one connected graph rooted at ${ROOT_PAGE} ` +
    `(+${EXEMPT.size} exempt) → dist/sitegraph.json`,
);
