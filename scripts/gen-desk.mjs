#!/usr/bin/env node
// Generate the ranked list in desk.html from data/front-desk.json.
//
//   node scripts/gen-desk.mjs           rewrite the marked region in desk.html
//   node scripts/gen-desk.mjs --check   exit 1 if the region is stale (no writes)
//
// Same shape as gen-contracts/gen-ledger/gen-map: generated marked region,
// hermetic, committed data, no network.
//
// FRESHNESS IS RENDERED, NOT ASSUMED. front-desk.sh prints the snapshot's age on
// every run and refuses to present an undatable one as a board, because a stale
// projection read as current is how a session picks the wrong work. A web page
// has the same failure mode with a wider audience, so the stamp is part of the
// page: the age is always shown, and past the threshold the page SAYS it is
// stale rather than quietly serving old ranks. Building without a generated_at
// fails outright — a board that cannot date itself is not a board.
//
// THE RANK IS THE BOARD'S. Nothing here sorts or scores; trim-front-desk.mjs
// carries the board's own Score through and this renders that order. A ranking
// computed on the site would be a different board wearing the same name.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = join(root, "desk.html");
const DATA = join(root, "data", "front-desk.json");
const START = "<!-- desk:start";
const END = "<!-- desk:end -->";

// The lane publishes hourly. A day means several dozen missed publishes, which
// is a broken lane rather than an unlucky moment — the number worth reacting to
// is "the lane stopped and nobody noticed", the same reasoning front-desk.sh
// uses for its own threshold.
const STALE_AFTER_HOURS = 24;

const args = new Set(process.argv.slice(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const data = JSON.parse(await readFile(DATA, "utf8"));
if (!data.generated_at || Number.isNaN(Date.parse(data.generated_at))) {
  console.error("✗ data/front-desk.json has no parseable generated_at — refusing to render a board that cannot state its age.");
  process.exit(1);
}

// Age is computed against the BUILD, not the reader's clock: this is a static
// page, so "3 hours ago" would be a lie the moment it is cached. The page states
// the stamp and lets the reader judge, and only the build-time staleness verdict
// is baked in.
const ageHours = (Date.now() - Date.parse(data.generated_at)) / 36e5;
const stale = ageHours > STALE_AFTER_HOURS;

function renderStamp() {
  const when = esc(data.generated_at);
  if (stale) {
    return [
      '      <div class="stamp stamp--stale">',
      `        <strong>This snapshot is old.</strong> The board was projected at <span class="mono">${when}</span>,`,
      `        more than ${STALE_AFTER_HOURS} hours before this build. The projection lane publishes hourly, so this`,
      "        means it stopped. Treat the ranking below as history, not as the board.",
      "      </div>",
    ].join("\n");
  }
  return [
    '      <div class="stamp">',
    `        Board projected at <span class="mono">${when}</span>, and rendered into this page at build time.`,
    "        The projection refreshes hourly; this page refreshes when the site rebuilds, so it can trail the board.",
    "      </div>",
  ].join("\n");
}

function renderTiles() {
  const tile = (n, l) => `        <div class="tile"><div class="tile__n">${n}</div><div class="tile__l">${esc(l)}</div></div>`;
  const w = data.withheld || {};
  return [
    '      <div class="desk__tiles">',
    tile(data.items.length, "shown"),
    // "not started" rather than the board's own status name: the copy lint reads a
    // bare "Todo" as a leftover placeholder marker and fails the build, which is a
    // fair rule catching a false positive here. It also reads better cold — a
    // stranger should not have to learn the board's internal vocabulary to parse a
    // tile.
    tile(w.todo_total ?? "?", "not started"),
    tile(w.claimed ?? 0, "already claimed"),
    tile(w.pull_requests ?? 0, "PRs (not claimable)"),
    "      </div>",
  ].join("\n");
}

function renderRows() {
  if (!data.items.length) {
    return [
      '      <div class="stamp">',
      "        <strong>Nothing claimable right now.</strong> Everything on the board is claimed,",
      "        finished, or waiting on a check.",
      "      </div>",
    ].join("\n");
  }
  return data.items.map((i) => [
    '      <div class="row">',
    `        <div class="row__score">${esc(i.score.toFixed(2))}</div>`,
    '        <div class="row__body">',
    `          <p class="row__title"><a href="${esc(i.url)}">${esc(i.title)}</a></p>`,
    // "prx · 434", not "bounded-systems/prx#434", for two reasons.
    //
    // The gate one: the brand colour gate scans built pages for hardcoded colour
    // literals, and `#434` IS a valid three-digit hex colour. Twenty-five rows of
    // GitHub issue refs read as fourteen hardcoded colours and failed the build.
    // That is a false positive in a shared gate rather than a defect here, but the
    // separator costs nothing and the gate protects something real.
    //
    // The copy one: the org prefix is identical on every row, so it is pure noise
    // in a list whose job is to be scanned quickly. The title already links to the
    // issue; this line only has to say where it lives.
    `          <p class="row__where">${esc(String(i.repo).replace(/^bounded-systems\//, ""))} &middot; ${esc(i.number)}</p>`,
    "        </div>",
    "      </div>",
  ].join("\n")).join("\n");
}

function renderFooterNote() {
  const w = data.withheld || {};
  const beyond = w.beyond_limit ?? 0;
  // Never a silent cap: if the list is truncated, the page says by how much.
  const held = [
    w.claimed ? `${w.claimed} already claimed` : null,
    w.pull_requests ? `${w.pull_requests} pull request(s), which are changes awaiting a check rather than work to pick up` : null,
    w.unscored ? `${w.unscored} unranked by the board` : null,
    beyond ? `${beyond} ranked below the ${data.limit} shown` : null,
  ].filter(Boolean);
  if (!held.length) return "";
  return `      <p class="desk__intro muted">Held back: ${esc(held.join("; "))}.</p>`;
}

function renderSection() {
  return [renderStamp(), renderTiles(), renderRows(), renderFooterNote()].filter(Boolean).join("\n");
}

function splice(html, body) {
  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s === -1 || e === -1) throw new Error("desk markers not found in desk.html — add <!-- desk:start … --> / <!-- desk:end -->");
  const afterStart = html.indexOf("-->", s) + 3;
  return `${html.slice(0, afterStart)}\n${body}\n`.concat(html.slice(e));
}

const html = await readFile(HTML, "utf8");
const next = splice(html, renderSection());

if (args.has("--check")) {
  if (next !== html) {
    console.error("✗ desk section in desk.html is stale — run: node scripts/gen-desk.mjs");
    console.error("  (note: the staleness BANNER is time-dependent, so this can drift as the snapshot ages — regenerate and commit.)");
    process.exit(1);
  }
  console.log(`✓ desk section is in sync (${data.items.length} item(s), board stamped ${data.generated_at})`);
  process.exit(0);
}

if (next !== html) {
  await writeFile(HTML, next);
  console.log(`✓ regenerated desk section (${data.items.length} item(s)${stale ? ", MARKED STALE" : ""})`);
} else {
  console.log("✓ desk section already up to date");
}
