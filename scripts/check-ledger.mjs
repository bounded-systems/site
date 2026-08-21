#!/usr/bin/env node
// P4 — every grade flip touches the ledger. The fourth predicate of
// docs/evidence-edges.md (.github-private): when a claim's grade moves or its gap
// narrows, something must say so.
//
//   node scripts/check-ledger.mjs
//
// Deterministic, dependency-free, offline. P1 and P4 are one tension split in two:
// no prose without evidence (P1), no evidence without prose (P4). P4 is the half
// that catches DEMO DRIFT — code merges, a grade flips, and no page says what we
// now believe.
//
// WHY A COMMITTED LEDGER AND NOT GIT HISTORY. Detecting a flip needs prior state.
// Diffing the previous commit would need git inside the build — not hermetic, and
// broken under the shallow clones CI uses. So prior state is committed data, and
// the invariant becomes a comparison this gate can make offline: the TIP entry for
// each claim must still describe that claim's current grade and gap.
//
// WHAT IT ENFORCES
//   1. every claim has at least one ledger entry;
//   2. the tip entry per claim matches the claim's CURRENT grade and gap hash —
//      a mismatch is a flip nobody recorded;
//   3. chain integrity: each entry's `from` equals the previous entry's `to` for
//      that claim, so a rewritten history breaks visibly instead of silently;
//   4. a transition entry names pages that carry a P1 edge to that claim — an
//      explanation pointed at a page that never cites the claim explains nothing.
//
// GENESIS ENTRIES (`from: null`) record the state a claim was in when the ledger
// opened. That is not a transition, so it needs no explaining page: there is no
// change yet to explain. Requiring one would have forced a page to be invented for
// c5, which no page cites — manufacturing prose to satisfy a gate is the same
// failure as manufacturing evidence.
//
// KNOWN LIMIT, STATED RATHER THAN IMPLIED. The framework doc says the page must
// have changed "in the same build". That needs commit-diff awareness — a CI-lane
// concern, not a hermetic-build one, the same split P2 draws between its in-build
// gate and its scheduled monitor. What runs here is: a flip must be RECORDED, and
// the record must name a page that genuinely cites the claim. Whether that page
// changed in that commit is not checked, and the doc should say so.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir } from "node:fs/promises";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const claimsFile = join(root, "integrity", "claims", "claims.jsonld");
const ledgerFile = join(root, "integrity", "claims", "ledger.jsonl");
const postsDir = join(root, "blog");

const GRADES = new Set(["enforced", "partial", "aspirational"]);
const gapHash = (gap) => (String(gap || "").trim() ? createHash("sha256").update(String(gap)).digest("hex").slice(0, 12) : "none");

let errors = 0;
const fail = (msg) => { console.error(`✗ ${msg}`); errors++; };

// ── current claims ───────────────────────────────────────────────────────────
const doc = JSON.parse(await readFile(claimsFile, "utf8"));
const assertion = (doc["@graph"] || []).find((g) => String(g["@id"]).endsWith("#assertion"));
const claims = new Map((assertion?.["@graph"] || []).map((c) => [String(c["@id"]).split("#")[1], c]));
if (!claims.size) fail(`${claimsFile}: no claims found`);

// ── which pages cite which claim (the P1 edges) ──────────────────────────────
const DIRECTIVE = /<!--\s*claims:\s*([^>]*?)\s*-->/i;
const citedBy = new Map(); // claim id -> Set(page path)
for (const name of (await readdir(postsDir)).filter((f) => f.endsWith(".md"))) {
  const md = await readFile(join(postsDir, name), "utf8");
  for (const id of (md.match(DIRECTIVE)?.[1] || "").split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)) {
    if (!citedBy.has(id)) citedBy.set(id, new Set());
    citedBy.get(id).add(`blog/${name}`);
  }
}

// ── ledger ───────────────────────────────────────────────────────────────────
const lines = (await readFile(ledgerFile, "utf8")).split("\n").map((l) => l.trim()).filter(Boolean);
const entries = [];
for (const [i, line] of lines.entries()) {
  let e;
  try { e = JSON.parse(line); } catch { fail(`ledger line ${i + 1}: not valid JSON`); continue; }
  if (e.$description) continue; // the header line
  entries.push({ ...e, line: i + 1 });
}
if (!entries.length) fail(`${ledgerFile}: no entries`);

const tip = new Map(); // claim -> last entry seen
for (const e of entries) {
  const at = `ledger line ${e.line}`;
  if (!claims.has(e.claim)) { fail(`${at}: unknown claim '${e.claim}'`); continue; }
  if (!GRADES.has(e.to)) { fail(`${at}: 'to' grade '${e.to}' not a grade`); continue; }
  if (!String(e.note || "").trim()) fail(`${at}: entry must carry a note saying what moved`);

  const prev = tip.get(e.claim);
  if (!prev) {
    if (e.from !== null) fail(`${at}: first entry for ${e.claim} must be genesis (from: null), got '${e.from}'`);
  } else {
    if (e.from !== prev.to) fail(`${at}: chain break — 'from' is '${e.from}' but ${e.claim}'s previous entry ended at '${prev.to}'`);
    // A real transition must point at prose that cites this claim.
    const pages = Array.isArray(e.pages) ? e.pages : [];
    if (!pages.length) {
      fail(`${at}: ${e.claim} moved ${e.from} → ${e.to} with no pages — a flip must be explained somewhere`);
    }
    for (const p of pages) {
      if (!citedBy.get(e.claim)?.has(p)) {
        fail(`${at}: page '${p}' does not carry a P1 edge to ${e.claim} — it cannot explain a change to a claim it never cites`);
      }
    }
  }
  tip.set(e.claim, e);
}

// ── the tip must still describe reality ──────────────────────────────────────
for (const [id, c] of claims) {
  const t = tip.get(id);
  if (!t) { fail(`${id}: no ledger entry — every claim needs at least a genesis entry`); continue; }
  if (t.to !== c.grade) fail(`${id}: unrecorded flip — ledger tip says '${t.to}', the claim is graded '${c.grade}'. Append an entry.`);
  const now = gapHash(c.gap);
  if (String(t.gapHash) !== now) fail(`${id}: unrecorded gap change — ledger tip carries ${t.gapHash}, the gap now hashes to ${now}. Append an entry.`);
}

if (errors) { console.error(`\n✗ ledger (${errors})`); process.exit(1); }
const transitions = entries.filter((e) => e.from !== null).length;
console.log(`✓ ledger current for ${claims.size} claim(s) — ${entries.length} entries, ${transitions} transition(s), tips match graded state`);
