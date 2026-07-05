#!/usr/bin/env node
// Generate the contract-lattice section of contracts.html from data/lattice.json.
//
// The block between `<!-- contracts:start … -->` and `<!-- contracts:end -->` in
// contracts.html is GENERATED — do not hand-edit. data/lattice.json itself is
// refreshed by scripts/gen-lattice.mjs (daily + on demand via
// .github/workflows/lattice-refresh.yml), which fetches trellis's signed
// status.json, verifies it with a real `cosign verify-blob` (not just displays
// the command for a human to run), and opens a PR only if verification passes
// and the projection changed. This script never touches the network — build-time
// generation stays hermetic (safe in `nix build`), unlike the page's original
// client-side `fetch()` of the same projection, which is why axe/structure-audit
// could never see real content in the static build output.
//
//   node scripts/gen-contracts.mjs            rewrite the marked region in contracts.html
//   node scripts/gen-contracts.mjs --check     exit 1 if the region is stale (no writes, offline)
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = join(root, "contracts.html");
const DATA = join(root, "data", "lattice.json");
const START = "<!-- contracts:start";
const END = "<!-- contracts:end -->";

const args = new Set(process.argv.slice(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderTiles(s) {
  const tile = (n, l, cls = "") => `        <div class="tile ${cls}"><div class="tile__n">${n}</div><div class="tile__l">${esc(l)}</div></div>`;
  return [
    '      <div class="lattice__tiles">',
    tile(s.nodes, "repos"),
    tile(s.checks, "checked"),
    tile(s.passing, "passing", "tile--pass"),
    tile(s.failing, "gaps", s.failing ? "tile--gap" : ""),
    tile(s.declared, "declared"),
    "      </div>",
  ].join("\n");
}

// Enforced first (the honest headline — a live check proves it), then declared
// (mapped, but nothing enforces it yet) — same ordering as the page's own prose.
function renderRows(checks, declared) {
  const row = (t, badge) => `          <tr>
            <td><code class="mono">${esc(t.type)}</code></td>
            <td class="kind">${esc(t.kind)}</td>
            <td><span class="badge ${badge}">${t.result === "fail" ? "Gap" : "Enforced"}</span></td>
            <td class="muted"><small>${esc(t.summary)}</small></td>
          </tr>`;
  const declaredRow = (t) => `          <tr>
            <td><code class="mono">${esc(t.type)}</code></td>
            <td class="kind">${esc(t.kind)}</td>
            <td><span class="badge badge--declared">Declared</span></td>
            <td class="muted"><small>${esc(t.summary)}</small></td>
          </tr>`;
  const sorted = [...checks].sort((a, b) => a.type.localeCompare(b.type));
  const sortedDeclared = [...declared].sort((a, b) => a.type.localeCompare(b.type));
  return [
    '      <table class="grid">',
    "        <thead>",
    "          <tr><th>Contract</th><th>Kind</th><th>Grade</th><th>Governs</th></tr>",
    "        </thead>",
    "        <tbody>",
    ...sorted.map((t) => row(t, t.result === "fail" ? "badge--gap" : "badge--pass")),
    ...sortedDeclared.map(declaredRow),
    "        </tbody>",
    "      </table>",
  ].join("\n");
}

function renderSection(data) {
  return [renderTiles(data.summary), renderRows(data.checks, data.declared)].join("\n");
}

function splice(html, body) {
  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s === -1 || e === -1) {
    throw new Error("contracts markers not found in contracts.html — add <!-- contracts:start … --> / <!-- contracts:end -->");
  }
  const afterStart = html.indexOf("-->", s) + 3;
  return `${html.slice(0, afterStart)}\n${body}\n      ${html.slice(e)}`;
}

const data = JSON.parse(await readFile(DATA, "utf8"));
const html = await readFile(HTML, "utf8");
const next = splice(html, renderSection(data));

if (args.has("--check")) {
  if (next !== html) {
    console.error("✗ contracts section in contracts.html is stale — run: node scripts/gen-contracts.mjs");
    process.exit(1);
  }
  console.log(`✓ contracts section is in sync with data/lattice.json (${data.summary.nodes} repos, ${data.checks.length + data.declared.length} contract types)`);
  process.exit(0);
}

if (next !== html) {
  await writeFile(HTML, next);
  console.log("✓ regenerated contracts section in contracts.html");
} else {
  console.log("✓ contracts section already up to date");
}
