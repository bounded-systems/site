// contract/gate.ts — the pull-shape gate. Validate each registered page-data cut
// against its Zod contract (contract/page.ts). Blocking: any cut that fails its
// schema, or is unreadable, fails CI. Source-side and offline — reads data/, not
// dist/, so it runs without a build.
//
//   deno run --allow-read --config contract/deno.json contract/gate.ts
//   deno run --allow-read --config contract/deno.json contract/gate.ts --check
//
// --check is accepted for symmetry with the gen-*.mjs gates; this gate never
// writes, so the two modes are identical.

import { CONTRACTS } from "./page.ts";

let failed = 0;
const cuts = Object.entries(CONTRACTS);

for (const [path, schema] of cuts) {
  let raw: unknown;
  try {
    raw = JSON.parse(await Deno.readTextFile(path));
  } catch (e) {
    failed++;
    console.log(`✗ ${path} — unreadable: ${(e as Error).message}`);
    continue;
  }
  const result = schema.safeParse(raw);
  if (result.success) {
    console.log(`✓ ${path} — conforms`);
  } else {
    failed++;
    console.log(`✗ ${path} — ${result.error.issues.length} issue(s):`);
    for (const issue of result.error.issues) {
      console.log(`    ${issue.path.join(".") || "$"} — ${issue.message}`);
    }
  }
}

console.log(`\ncontracts: ${cuts.length} cut(s) · ${failed} failing`);
Deno.exit(failed > 0 ? 1 : 0);
