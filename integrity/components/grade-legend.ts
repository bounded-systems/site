// Content-addresses the grade-legend components (index.html's `.legend__head` spans:
// Enforced / Partial / Aspirational) via @bounded-systems/baobab's address() —
//
//   address = sha256( tokens-used + template source + rendered markup + lone blessing )
//
// This proves "this exact component, themed this way, blessed clean" is a checkable
// fact, not an assertion — closing the same gap that let a stale, pre-fix token
// snapshot ship silently elsewhere in this ecosystem (bdelanghe/brand's palette-gate
// incident, bounded-systems/mint#11). If the grade dot's markup, the brand tokens it
// slots, or lone's accessibility verdict on it ever drift from the committed baseline
// below, --check fails closed instead of a regression shipping unnoticed.
//
// The template is the ACTUAL composed markup from index.html's legend, not a
// re-creation from scratch — a colored dot plus the grade's visible label. Color is
// never the sole channel (the label is always present), so blessing the whole
// `.legend__head` (not just the bare `.grade__dot`) is the meaningful accessible unit.
//
// Run: deno run --allow-read integrity/components/grade-legend.ts [--check]

import { address, flattenTokens } from "jsr:@bounded-systems/baobab@^0.2.1";

const here = new URL(".", import.meta.url).pathname;
const root = new URL("../..", import.meta.url).pathname;
const baselinePath = `${here}grade-legend.address.json`;
const check = Deno.args.includes("--check");

async function exists(p: string): Promise<boolean> {
  try {
    await Deno.stat(p);
    return true;
  } catch {
    return false;
  }
}

// Same brand-resolution precedence as build.mjs: prefer the flake-materialized
// brand/ (nix build), fall back to the installed npm dependency.
const brandDir = (await exists(`${root}brand/tokens/tokens.json`))
  ? `${root}brand`
  : `${root}node_modules/@bounded-systems/brand`;
const rawTokens = JSON.parse(
  await Deno.readTextFile(`${brandDir}/tokens/tokens.json`),
);
const tokens = flattenTokens(rawTokens);

const legendHead = (t: Record<string, string>, p: Record<string, unknown>) =>
  `<span class="legend__head legend__head--${p.grade}"><span class="grade__dot" style="background:${
    t[`grade.${p.grade}`]
  };"></span>${p.label}</span>`;

const VARIANTS = [
  { grade: "enforced", label: "Enforced" },
  { grade: "partial", label: "Partial" },
  { grade: "aspirational", label: "Aspirational" },
];

const results: Record<string, { sha: string; blessed: boolean; used: Record<string, string> }> = {};
for (const props of VARIANTS) {
  const a = await address(tokens, legendHead, props, "span.legend__head");
  results[props.grade as string] = { sha: a.sha, blessed: a.blessed, used: a.used };
  console.log(`${a.blessed ? "✓" : "✗"} ${props.grade}: ${a.sha.slice(0, 12)}… blessed=${a.blessed}`);
}

if (check) {
  const baseline = JSON.parse(await Deno.readTextFile(baselinePath));
  let bad = 0;
  for (const grade of Object.keys(results)) {
    const a = results[grade];
    const b = baseline[grade];
    if (!b) {
      console.error(`✗ ${grade}: no baseline entry — run without --check to write one`);
      bad++;
      continue;
    }
    if (a.sha !== b.sha || !a.blessed) {
      console.error(
        `✗ ${grade}: address drifted from the committed baseline (or lone no longer blesses it) — ` +
          `a token value, the template, or the a11y verdict changed. If intentional, re-run without ` +
          `--check to update grade-legend.address.json and commit the new baseline.`,
      );
      bad++;
    }
  }
  if (bad) {
    console.error(`✗ component-address: ${bad} drift(s)`);
    Deno.exit(1);
  }
  console.log("✓ component-address: every grade-legend variant matches its committed, blessed address");
} else {
  await Deno.writeTextFile(baselinePath, JSON.stringify(results, null, 2) + "\n");
  console.log(`Wrote ${baselinePath}`);
}
