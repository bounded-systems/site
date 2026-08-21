#!/usr/bin/env node
// Generate the per-claim registry rows on the homepage from the claims graph.
//
// The block between `<!-- claims-registry:start … -->` and
// `<!-- claims-registry:end -->` in index.html is GENERATED — do not hand-edit
// it. Edit the sources and run this script:
//
//   node scripts/gen-claims-rows.mjs           rewrite the marked region in index.html
//   node scripts/gen-claims-rows.mjs --check   exit 1 if the region is stale (no writes)
//
// Sources — the same files the rest of the build already treats as canonical,
// so the page cannot drift from the signed list it links to:
//   integrity/claims/claims.jsonld     the six hand-graded claims (c1–c6)
//   scripts/legibility/verdict.mjs     the legibility gate's claim + gap text
//   content/strings.json               the grade heads/definitions (data-str)
//   data/jargon.json                   grounding URLs for jargon in claim text
//
// WHY THE LEGIBILITY ROW SAYS ENFORCED. Its grade in the served graph is
// computed per build (check.mjs --jsonld): enforced on a pass, aspirational on
// a fail. The deterministic gate is a build step that fails the build, so a
// page that ships is a page the gate passed — the committed row states the only
// grade a deployed page can carry, and the gap right under it says what that
// grade does and does not prove.
//
// Jargon in claim/gap text is linked to its source from data/jargon.json — the
// same vocabulary check-jargon.mjs enforces — so rendering the graph's words
// onto the page cannot introduce ungrounded jargon.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEGIBILITY_CLAIM } from "./legibility/verdict.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = join(root, "index.html");
const CLAIMS = join(root, "integrity", "claims", "claims.jsonld");
const STRINGS = join(root, "content", "strings.json");
const JARGON = join(root, "data", "jargon.json");
const START = "<!-- claims-registry:start";
const END = "<!-- claims-registry:end -->";
const CHECK = process.argv.includes("--check");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const strings = JSON.parse(await readFile(STRINGS, "utf8"));
const str = (key) => {
  const v = strings[key]?.$value;
  if (typeof v !== "string") throw new Error(`content/strings.json has no "${key}" — the grade heads/defs are single-sourced there`);
  return v;
};

const jargon = Object.entries(JSON.parse(await readFile(JARGON, "utf8")))
  .filter(([term]) => !term.startsWith("$"));
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Ground each jargon term to its ONE source URL (check-jargon's own boundary
// rule), on already-escaped text — the vocabulary's terms carry no HTML chars.
const ground = (escaped) => {
  let out = escaped;
  for (const [term, url] of jargon) {
    out = out.replace(
      new RegExp(`(?<![\\w-])${reEsc(term)}(?![\\w-])`, "g"),
      `<a href="${esc(url)}" rel="noopener">${term}</a>`,
    );
  }
  return out;
};

// Evidence link label: the pinned file's basename, or the repo name for a
// repo-root link (aspirational claims pin nothing by design — see
// check-evidence-pinned.mjs).
const evidenceLabel = (url) => {
  const parts = String(url).replace(/[#?].*$/, "").split("/").filter(Boolean);
  return parts[parts.length - 1];
};

const doc = JSON.parse(await readFile(CLAIMS, "utf8"));
const assertion = (doc["@graph"] || []).find((g) => String(g["@id"]).endsWith("#assertion"));
const hand = assertion?.["@graph"] || [];
if (!hand.length) { console.error("✗ gen-claims-rows: no claims in the assertion graph"); process.exit(1); }

// The machine-emitted claim joins its grade bucket like any other; grounded via
// data-claim only for the hand-written six, whose @ids live in the committed
// graph check-emphasis resolves against.
const rows = [
  ...hand.map((c) => ({ ...c, id: String(c["@id"]), machine: false })),
  { id: LEGIBILITY_CLAIM.id, claim: LEGIBILITY_CLAIM.claim, grade: "enforced", gap: LEGIBILITY_CLAIM.gap, evidence: LEGIBILITY_CLAIM.evidence, machine: true },
];

const GRADE_ORDER = ["enforced", "partial", "aspirational"];
for (const r of rows) {
  if (!GRADE_ORDER.includes(r.grade)) { console.error(`✗ gen-claims-rows: ${r.id} has grade '${r.grade}'`); process.exit(1); }
}

function renderRow(c) {
  const short = c.id.split("#")[1];
  const lead = c.machine
    ? `<b class="legend__claim-id">${esc(short)}</b>`
    : `<strong class="legend__claim-id" data-claim="${esc(c.id)}">${esc(short)}</strong>`;
  const evidence = `<a class="legend__evidence" href="${esc(c.evidence)}" rel="noopener">${esc(evidenceLabel(c.evidence))}&nbsp;&#8599;&#xFE0E;<span class="u-sr-only"> (evidence, external site)</span></a>`;
  const out = [
    `            <li class="legend__claim">`,
    `              <p class="legend__claim-text">${lead} — ${ground(esc(c.claim))} ${evidence}</p>`,
  ];
  if (String(c.gap || "").trim()) {
    out.push(`              <p class="legend__gap"><b class="legend__gap-label">Gap</b> — ${ground(esc(c.gap))}</p>`);
  }
  out.push(`            </li>`);
  return out.join("\n");
}

function renderCard(grade) {
  const claims = rows.filter((c) => c.grade === grade);
  return [
    `          <div class="legend__card">`,
    `            <span class="legend__head legend__head--${grade}"><span class="grade__dot" style="background:var(--grade-${grade});"></span><span data-str="grade-${grade}">${esc(str(`grade-${grade}`))}</span></span>`,
    `            <p data-str="grade-${grade}-def">${esc(str(`grade-${grade}-def`))}</p>`,
    `            <ul class="legend__list">`,
    ...claims.map(renderRow),
    `            </ul>`,
    `          </div>`,
  ].join("\n");
}

const grid = [
  `        <div class="legend">`,
  ...GRADE_ORDER.map(renderCard),
  `        </div>`,
].join("\n");

const html = await readFile(HTML, "utf8");
const s = html.indexOf(START);
const e = html.indexOf(END);
if (s === -1 || e === -1) {
  console.error("✗ gen-claims-rows: markers not found in index.html — add <!-- claims-registry:start … --> / <!-- claims-registry:end -->");
  process.exit(1);
}
const afterStart = html.indexOf("-->", s) + 3;
const next = `${html.slice(0, afterStart)}\n${grid}\n        ${html.slice(e)}`;

if (CHECK) {
  if (next !== html) {
    console.error("✗ index.html claims registry is stale — run: node scripts/gen-claims-rows.mjs");
    process.exit(1);
  }
  console.log(`✓ claims registry current — ${rows.length} claims across ${GRADE_ORDER.length} grades`);
} else {
  if (next !== html) await writeFile(HTML, next);
  console.log(`✓ claims registry: ${rows.length} rows → index.html`);
}
