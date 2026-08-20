#!/usr/bin/env node
// P3 — wording strength may not exceed grade strength. The third predicate of
// docs/evidence-edges.md (.github-private): prose must not assert more than its
// grade earns.
//
//   node scripts/check-overclaim.mjs
//
// Deterministic, dependency-free, offline — same shape as the sibling gates.
// A claim graded `partial` or `aspirational` may not use an absolute quantifier
// in its CLAIM TEXT. Enforced claims may: the grade is what earns the word.
//
// This generalizes the Lane C rule from legibility-push.md — "write 'git-writes,
// egress, and external reads', never 'every'" — from an editorial decision a
// human has to remember into a lint keyed to the grades in the feed.
//
// THE GAP TEXT IS EXEMPT BY CONSTRUCTION. A gap is disclosure: "not", "never",
// "until" are how a limit gets stated honestly, and linting them would punish
// the exact sentence doing the honest work.
//
// WHY THIS DOES NOT LINT BODY PROSE — measured, not assumed. A naive absolute-word
// scan over the five posts plus index.html produced ~17 hits with essentially one
// candidate overclaim: "I run an agent on my own work EVERY day", "NEVER the keys
// behind it" (describing a mechanism), "passes EVERY standard check" (describing an
// ATTACKER's artifact). At ~8 false positives per real finding, a prose-wide lint is
// the "fighting the voice" failure docs/evidence-edges.md names as the signal that
// the predicate is wrong. Body prose also cannot be statically attributed to a
// specific claim, so "says 'every' ABOUT a partial claim" is not decidable there.
// Claim text is where grade attribution is exact, so that is where the rule binds.
//
// The allowlist is the pressure valve the doc prescribes: an exemption must carry a
// reason, so it is a reviewable artifact rather than a silent weakening.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const claimsFile = join(root, "integrity", "claims", "claims.jsonld");
const allowFile = join(root, "content", "overclaim-allowlist.json");

// Absolutes that promise totality or impossibility. Deliberately short: each word
// here must be one that turns a hedged claim into an unconditional one.
const ABSOLUTES = ["every", "always", "never", "all", "any", "guaranteed", "impossible", "no one", "nothing", "cannot"];
const NEEDS_HEDGE = new Set(["partial", "aspirational"]);

const doc = JSON.parse(await readFile(claimsFile, "utf8"));
const assertion = (doc["@graph"] || []).find((g) => String(g["@id"]).endsWith("#assertion"));
const claims = assertion?.["@graph"] || [];

const allow = JSON.parse(await readFile(allowFile, "utf8"));

let errors = 0;
const fail = (msg) => { console.error(`✗ ${msg}`); errors++; };

if (!claims.length) fail(`${claimsFile}: no claims found`);

let checked = 0, exempted = 0;
for (const c of claims) {
  const id = String(c["@id"]).split("#")[1] || "(unnamed)";
  if (!NEEDS_HEDGE.has(c.grade)) continue;
  checked++;
  const text = String(c.claim || "");
  for (const word of ABSOLUTES) {
    if (!new RegExp(`\\b${word}\\b`, "i").test(text)) continue;
    const key = `${id}:${word}`;
    const reason = allow[key];
    if (typeof reason === "string" && reason.trim()) { exempted++; continue; }
    if (key in allow) { fail(`${key}: allowlisted with no reason — an exemption must say why, or it is a silent weakening`); continue; }
    fail(`${id}: '${c.grade}' claim says "${word}" — wording exceeds grade. Reword, or add "${key}" to content/overclaim-allowlist.json with a reason.`);
  }
}

// A stale exemption is its own drift: it reads as a live judgement while the text
// it excused is long gone.
for (const key of Object.keys(allow).filter((k) => !k.startsWith("$"))) {
  const [id, word] = key.split(":");
  const c = claims.find((x) => String(x["@id"]).endsWith(`#${id}`));
  if (!c) { fail(`allowlist ${key}: no such claim`); continue; }
  if (!new RegExp(`\\b${word}\\b`, "i").test(String(c.claim || ""))) {
    fail(`allowlist ${key}: '${word}' no longer appears in ${id}'s claim text — drop the stale exemption`);
  }
}

if (errors) { console.error(`\n✗ overclaim (${errors})`); process.exit(1); }
console.log(`✓ ${checked} non-enforced claim(s) checked — wording within grade (${exempted} reasoned exemption(s))`);
