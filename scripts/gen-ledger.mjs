#!/usr/bin/env node
// Generate the entry list in ledger.html from integrity/claims/ledger.jsonl, and
// emit the raw record to dist/ledger.jsonl.
//
//   node scripts/gen-ledger.mjs           rewrite the marked region in ledger.html
//   node scripts/gen-ledger.mjs --check   exit 1 if the region is stale (no writes)
//
// Same shape as gen-contracts.mjs: the block between `<!-- ledger:start … -->` and
// `<!-- ledger:end -->` is GENERATED — do not hand-edit. Rendered at build time from
// committed data, never a client-side fetch: a fetched page shows axe and the
// structure-audit an empty shell, so the gates would be grading markup no reader
// ever sees.
//
// WHY THIS PAGE EXISTS. Claims look identical whether they moved last week or last
// year, so a reader cannot tell a live site from a dusty one by reading them. What
// reads as alive is DIFFERENCE. P4's ledger already records exactly that, because
// the build gate needs it — this projects it, and adds no new data collection.
//
// HONESTY RULE THIS FILE KEEPS. Genesis entries (`from: null`) are a starting
// position, not a movement. They are rendered apart and excluded from the
// transition count, and when there are no transitions the page SAYS there has been
// no movement rather than dressing six seed rows up as activity. A page about
// honesty that inflates its own liveliness would be self-refuting.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = join(root, "ledger.html");
const DATA = join(root, "integrity", "claims", "ledger.jsonl");
const START = "<!-- ledger:start";
const END = "<!-- ledger:end -->";

const args = new Set(process.argv.slice(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const raw = await readFile(DATA, "utf8");
const entries = raw.split("\n").map((l) => l.trim()).filter(Boolean)
  .map((l) => JSON.parse(l)).filter((e) => !e.$description);

const transitions = entries.filter((e) => e.from !== null);
const genesis = entries.filter((e) => e.from === null);

const badge = (grade) => `<span class="badge badge--${esc(grade)}">${esc(grade)}</span>`;

function renderTiles() {
  const tile = (n, l) => `        <div class="tile"><div class="tile__n">${n}</div><div class="tile__l">${esc(l)}</div></div>`;
  return [
    '      <div class="ledger__tiles">',
    tile(transitions.length, transitions.length === 1 ? "movement" : "movements"),
    tile(genesis.length, "claims tracked"),
    tile(entries.length, "entries"),
    "      </div>",
  ].join("\n");
}

// Newest first: a reader wants the most recent movement, not the seed rows.
// Stable within a date — the file's own order is the tiebreaker, reversed.
const byNewest = (list) => [...list].reverse().sort((a, b) => String(b.date).localeCompare(String(a.date)));

function renderEntry(e) {
  const move = e.from === null
    ? `<span class="badge badge--genesis">genesis</span> ${badge(e.to)}`
    : `<span class="move">${badge(e.from)} &rarr; ${badge(e.to)}</span>`;
  const pages = (Array.isArray(e.pages) ? e.pages : []).map((p) => {
    // A page reference is a blog post (the P1 directive) or the homepage claims
    // registry (data-claim edges — see check-ledger.mjs). Link each to where a
    // reader actually lands: /blog/<slug>, or the registry's own section.
    if (String(p) === "index.html") return `<a href="/#status">the claims registry</a>`;
    const slug = String(p).replace(/^blog\//, "").replace(/\.md$/, "");
    return `<a href="/blog/${esc(slug)}">${esc(slug)}</a>`;
  });
  return [
    '      <div class="entry">',
    '        <div class="entry__head">',
    `          <span class="entry__date">${esc(e.date)}</span>`,
    `          <span class="entry__claim">${esc(e.claim)}</span>`,
    `          ${move}`,
    "        </div>",
    `        <p class="entry__note">${esc(e.note)}</p>`,
    pages.length ? `        <p class="entry__pages">Explained in: ${pages.join(", ")}</p>` : "",
    "      </div>",
  ].filter(Boolean).join("\n");
}

function renderSection() {
  const out = [renderTiles()];
  if (!transitions.length) {
    out.push(
      '      <div class="quiet">',
      "        <p><strong>No movement yet.</strong> Every claim below is at the grade it",
      "        held when this ledger opened — nothing has changed since. The page fills in",
      "        when a grade first moves, and the gate is what guarantees that entry exists.</p>",
      "      </div>",
    );
  } else {
    out.push("      <h2>Movements</h2>", ...byNewest(transitions).map(renderEntry));
  }
  out.push('      <h2 style="margin-top:2rem">Starting positions</h2>', ...byNewest(genesis).map(renderEntry));
  return out.join("\n");
}

function splice(html, body) {
  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s === -1 || e === -1) throw new Error("ledger markers not found in ledger.html — add <!-- ledger:start … --> / <!-- ledger:end -->");
  const afterStart = html.indexOf("-->", s) + 3;
  return `${html.slice(0, afterStart)}\n${body}\n`.concat(html.slice(e));
}

const html = await readFile(HTML, "utf8");
const next = splice(html, renderSection());

if (args.has("--check")) {
  if (next !== html) {
    console.error("✗ ledger section in ledger.html is stale — run: node scripts/gen-ledger.mjs");
    process.exit(1);
  }
  console.log(`✓ ledger section is in sync with ledger.jsonl (${transitions.length} movement(s), ${genesis.length} claims tracked)`);
  process.exit(0);
}

if (next !== html) {
  await writeFile(HTML, next);
  console.log(`✓ regenerated ledger section in ledger.html (${transitions.length} movement(s))`);
} else {
  console.log("✓ ledger section already up to date");
}

// The record served as data, alongside claims.jsonld and provenance.json — a page
// that says "check it yourself" has to hand over the thing being checked.
if (args.has("--dist")) {
  await mkdir(join(root, "dist"), { recursive: true });
  await writeFile(join(root, "dist", "ledger.jsonl"), raw);
  console.log("✓ ledger: raw record → dist/ledger.jsonl");
}
