#!/usr/bin/env node
// check-license — the licence this repo declares is ONE fact, stated in three
// places, and they may not disagree.
//
//   node scripts/check-license.mjs
//
// WHY THIS EXISTS. Before #233 §4 the licence appeared in exactly one place: a
// string in the homepage footer reading "Source-available · PolyForm
// Noncommercial 1.0.0". There was no LICENSE file and no `license` field in
// package.json, so that sentence was asserted by nothing — the one claim on the
// page that no gate touched, on a site whose argument is that claims are graded
// against the code behind them. A licence is also the worst possible place for
// an unbacked claim: it is the sentence a stranger relies on before using any of
// this, and being wrong about it is expensive in a way a stale anchor is not.
//
// THE THREE SURFACES, and why each has to exist rather than being folded away:
//
//   1. LICENSE (repo root)   — the legal artifact. GitHub's licence detection,
//                              SPDX scanners and every corporate review process
//                              read this file and nothing else. It is canonical.
//   2. package.json.license  — the machine-readable SPDX id. Tooling that reads
//                              manifests never opens LICENSE.
//   3. the homepage footer   — the only one a *reader* sees.
//
// None can be dropped: they serve three different audiences. So the honest
// shape is one source and a check, not one file and two hopes. This gate is
// that check — a forcing function in the org's sense (`docs/agentic-code-hygiene.md`):
// the three cannot drift apart, because the build stops if they do.
//
// SCOPE, stated plainly so it is not mistaken for more than it is. This gate
// compares the repo against ITSELF. It does not know org policy. The org's
// licence policy is `ORG_LICENSE` in `.github-private` → `registry/license.ts`,
// which is a PRIVATE repo, and its `lic` gate reads what packages declare on
// JSR. This site is public and is not published to JSR, so it is outside that
// gate's reach in both directions: it cannot import the policy without a public
// repo depending on a private one, and the policy's own checker never looks at
// it. Making the site's licence derive from the org policy mechanically would
// need the policy published to a public surface first — see #233 §4.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
// Same escape the repo already uses in check-jargon.mjs. Needed, not decorative:
// `declared` comes out of package.json, so interpolating it raw into a RegExp is
// regex injection (CodeQL js/regex-injection, high) — a manifest could inject
// pattern syntax and make this gate match things it should not, or hang.
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let errors = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); errors++; };

// 1. package.json — the SPDX id is the value the other two are compared against,
//    because it is the only one of the three that is already a machine-readable
//    identifier rather than prose containing one.
const pkg = JSON.parse(read("package.json"));
const declared = pkg.license;
if (!declared) {
  fail("package.json has no `license` field — nothing to check the others against");
  console.error("\n✗ check-license: the repo declares no licence");
  process.exit(1);
}

// 2. LICENSE — must exist, and must be the licence package.json names. Matching
//    on the title line rather than the full text: the body of a licence is
//    boilerplate that varies by punctuation and year, and a diff against a
//    vendored copy would fail for reasons nobody cares about. The title is the
//    part that says WHICH licence this is.
let licenseText = "";
try {
  licenseText = read("LICENSE");
} catch {
  fail("no LICENSE file at the repo root — GitHub's licence detection and every SPDX scanner read this file and nothing else");
}
if (licenseText) {
  const title = licenseText.split("\n", 1)[0].trim();
  if (!new RegExp(`\\b${esc(declared)}\\b`, "i").test(title)) {
    fail(`LICENSE opens with "${title}" but package.json declares "${declared}"`);
  }
  if (!/copyright \(c\)\s+\d{4}/i.test(licenseText)) {
    fail("LICENSE carries no `Copyright (c) <year> <holder>` line — an MIT grant without one names no grantor");
  }
}

// 3. the homepage footer — prose, so the test is that the id appears in it and
//    that no OTHER licence id does. The second half is what catches the failure
//    this gate was written for: a footer left saying PolyForm while the manifest
//    says MIT reads as authoritative to a person and is invisible to a scanner.
const KNOWN_OTHER = [
  "PolyForm[- ]Noncommercial", "Apache", "GPL", "BSD", "MPL", "AGPL", "LGPL",
  "Unlicense", "ISC", "proprietary", "all rights reserved", "source-available",
];
const footer = (read("index.html").match(/<div class="footer__meta">([\s\S]*?)<\/div>/) || [])[1];
if (!footer) {
  fail("no footer__meta block in index.html — the licence line a reader sees is missing");
} else {
  if (!new RegExp(`\\b${esc(declared)}\\b`).test(footer)) {
    fail(`the homepage footer does not name "${declared}": ${footer.replace(/<[^>]+>/g, "").trim()}`);
  }
  for (const other of KNOWN_OTHER) {
    if (new RegExp(other, "i").test(footer) && !new RegExp(other, "i").test(declared)) {
      fail(`the homepage footer still names "${other}" while package.json declares "${declared}"`);
    }
  }
}

if (errors) {
  console.error(`\n✗ check-license: ${errors} disagreement(s) about what this repo is licensed under`);
  process.exit(1);
}
console.log(`✓ check-license: LICENSE, package.json and the homepage footer all say ${declared}`);
