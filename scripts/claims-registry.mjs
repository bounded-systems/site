#!/usr/bin/env node
// The claims registry — every graded claim with its sentence, grade, named gap
// and evidence link, rendered on /conformance.
//
//   node scripts/claims-registry.mjs --check   verify the committed projection is current
//
// Imported as a MODULE by scripts/gen-conformance.mjs, which injects
// renderRegistry() into the page it emits. There is no file-rewriting mode here:
// dist/conformance.html is generated wholesale on every build, so it cannot be
// hand-edited into drift the way a committed source file can.
//
// WHY /conformance AND NOT THE HOMEPAGE. The landing page is deliberately kept
// free of the org's metaphor vocabulary, and that is enforced three ways — the
// deny lexicon in scripts/legibility/lexicon.txt (via check.mjs on dist/index.md),
// and two cold-read tests asserting the whole 11-term canary stays live. The
// canonical claim text uses that vocabulary ("door", "at scale"), so rendering it
// on the homepage would have meant either editing the signed record or blunting
// the instrument. All three constraints are scoped to index.html alone, so the
// evidence surface carries the registry verbatim at no cost: nothing is omitted,
// nothing is reworded, and no gate, lexicon or test changes.
//
// SOURCES — the same files the rest of the build treats as canonical:
//   integrity/claims/claims.jsonld     the six hand-graded claims (c1–c6)
//   scripts/legibility/verdict.mjs     the legibility gate's claim + gap text
//   data/jargon.json                   grounding URLs for jargon in claim text
//
// WHAT --check ACTUALLY PROVES. content/pages/conformance.md is the committed
// markdown projection of the built page (gen-markdown.mjs), and it is already
// drift-gated. This check asserts that every claim's CURRENT sentence and gap
// appear in that projection — so editing claims.jsonld without rebuilding fails
// here, offline, with a message naming the claim. It is a check on committed
// bytes, not a generator confirming its own output.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEGIBILITY_CLAIM } from "./legibility/verdict.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLAIMS = join(root, "integrity", "claims", "claims.jsonld");
const JARGON = join(root, "data", "jargon.json");
const PROJECTION = join(root, "content", "pages", "conformance.md");

const GRADE_ORDER = ["enforced", "partial", "aspirational"];

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Ground each jargon term to its ONE source URL — the same vocabulary and the
// same one-source rule check-jargon.mjs enforces on the homepage. Applied to
// already-escaped text; the vocabulary's terms carry no HTML metacharacters.
function ground(escaped, jargon) {
  let out = escaped;
  for (const [term, url] of jargon) {
    out = out.replace(
      new RegExp(`(?<![\\w-])${reEsc(term)}(?![\\w-])`, "g"),
      `<a href="${esc(url)}" rel="noopener">${term}</a>`,
    );
  }
  return out;
}

// Evidence label: the pinned file's basename, or the repo name for a repo-root
// link (aspirational claims pin nothing by design — check-evidence-pinned.mjs).
const evidenceLabel = (url) => {
  const parts = String(url).replace(/[#?].*$/, "").split("/").filter(Boolean);
  return parts[parts.length - 1];
};

export async function loadClaims() {
  const doc = JSON.parse(await readFile(CLAIMS, "utf8"));
  const assertion = (doc["@graph"] || []).find((g) => String(g["@id"]).endsWith("#assertion"));
  const hand = assertion?.["@graph"] || [];
  if (!hand.length) throw new Error("claims-registry: no claims in the assertion graph");

  // The machine-emitted legibility verdict joins the same list. Its grade in the
  // SERVED graph is computed per build (check.mjs --jsonld: enforced on a pass,
  // aspirational on a fail); the deterministic gate is a build step that fails
  // the build, so a page that ships is a page it passed.
  const rows = [
    ...hand.map((c) => ({
      id: String(c["@id"]),
      short: String(c["@id"]).split("#")[1],
      claim: c.claim, grade: c.grade, gap: c.gap, evidence: c.evidence,
    })),
    {
      id: LEGIBILITY_CLAIM.id,
      short: LEGIBILITY_CLAIM.id.split("#")[1],
      claim: LEGIBILITY_CLAIM.claim,
      grade: "enforced",
      gap: LEGIBILITY_CLAIM.gap,
      evidence: LEGIBILITY_CLAIM.evidence,
    },
  ];
  for (const r of rows) {
    if (!GRADE_ORDER.includes(r.grade)) {
      throw new Error(`claims-registry: ${r.short} has grade '${r.grade}'`);
    }
  }
  return rows;
}

export async function renderRegistry() {
  const rows = await loadClaims();
  const jargon = Object.entries(JSON.parse(await readFile(JARGON, "utf8")))
    .filter(([term]) => !term.startsWith("$"));

  const renderRow = (c) => {
    // The head is deliberately TWO children — an id and everything else — so the
    // markdown projection pairs it as `**c5** — aspirational · prx`, which is the
    // shape gen-markdown.mjs gives every projected data row (a ledger entry, a
    // desk row, a stat tile). That matters beyond looks: check-repetition.mjs
    // skips that shape, because rows that carry the same fields necessarily look
    // alike — two aspirational claims both evidenced by the prx repo root are
    // data being data, not the site saying something twice. The claim sentence
    // and the gap below stay ordinary prose and stay counted, so a genuine
    // restatement between a claim and its homepage summary still surfaces.
    const out = [
      '        <li class="registry__claim">',
      '          <div class="registry__head">',
      `            <span class="registry__id">${esc(c.short)}</span>`,
      '            <span class="registry__meta">',
      `              <span class="grade grade--${esc(c.grade)}"><span class="grade__dot"></span>${esc(c.grade)}</span>`,
      `              <a class="registry__evidence" href="${esc(c.evidence)}" rel="noopener">${esc(evidenceLabel(c.evidence))}&nbsp;&#8599;&#xFE0E;<span class="u-sr-only"> (evidence, external site)</span></a>`,
      "            </span>",
      "          </div>",
      `          <p class="registry__text">${ground(esc(c.claim), jargon)}</p>`,
    ];
    if (String(c.gap || "").trim()) {
      out.push(`          <p class="registry__gap"><b class="registry__gap-label">Gap</b> — ${ground(esc(c.gap), jargon)}</p>`);
    }
    out.push("        </li>");
    return out.join("\n");
  };

  const ordered = GRADE_ORDER.flatMap((g) => rows.filter((r) => r.grade === g));
  return [
    '    <section class="registry" id="claims">',
    "      <h2>The claims registry</h2>",
    '      <p class="registry__lead">Every claim this project makes about itself, with the grade it holds, the gap that grade leaves open, and a link to the code that backs it. Rendered from the same signed graph the site publishes at <a href="/claims.jsonld">claims.jsonld</a> — the sentences below are that file\'s, not a summary of it.</p>',
    '      <ul class="registry__list">',
    ...ordered.map(renderRow),
    "      </ul>",
    "    </section>",
  ].join("\n");
}

// --- the drift check, over committed bytes -----------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.argv.includes("--check")) {
    console.error("usage: claims-registry --check   (rendering happens via gen-conformance.mjs)");
    process.exit(2);
  }
  const rows = await loadClaims();
  let projection;
  try {
    projection = await readFile(PROJECTION, "utf8");
  } catch {
    console.error(`✗ claims-registry: ${PROJECTION} is missing — run: node scripts/gen-markdown.mjs`);
    process.exit(1);
  }
  // Compare PROSE, not markup. The projection escapes a few characters and
  // renders each grounded jargon term as a markdown link, so unwrap `[text](url)`
  // to `text` and drop the escapes before matching. Demanding byte identity here
  // would make the check fail on the grounding it is supposed to be indifferent
  // to, which would be a finding about the instrument rather than the page.
  const norm = (s) => s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\\([\\`*_[\]])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const hay = norm(projection);
  let missing = 0;
  for (const c of rows) {
    if (!hay.includes(norm(c.claim))) {
      console.error(`✗ ${c.short}: claim sentence is not in content/pages/conformance.md`);
      missing++;
    }
    if (String(c.gap || "").trim() && !hay.includes(norm(c.gap))) {
      console.error(`✗ ${c.short}: gap text is not in content/pages/conformance.md`);
      missing++;
    }
  }
  if (missing) {
    console.error(`✗ claims-registry: ${missing} claim text(s) missing from the projection — the registry is stale. Run: npm run build`);
    process.exit(1);
  }
  console.log(`✓ claims registry — ${rows.length} claims render on /conformance, projection current`);
}
