#!/usr/bin/env node
// Run the build steps for one or more phases, in the order declared by
// scripts/pipeline.mjs — the single source of truth for what the build does.
//
//   node scripts/run-pipeline.mjs hermetic                 # what the nix derivation runs
//   node scripts/run-pipeline.mjs stamped                  # what deploy runs on staged dist/
//   node scripts/run-pipeline.mjs hermetic stamped local   # the full local build
//   node scripts/run-pipeline.mjs --list                   # print the resolved plan, run nothing
//
// Fails closed: an unknown phase, or a phase that selects no steps, is an error
// rather than a silent no-op — a typo here would otherwise skip the build.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STEPS, PHASES } from "./pipeline.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const listOnly = argv.includes("--list");
const phases = argv.filter((a) => a !== "--list");

if (phases.length === 0) {
  console.error(`usage: run-pipeline <phase...>   (phases: ${PHASES.join(", ")})`);
  process.exit(2);
}

const unknown = phases.filter((p) => !PHASES.includes(p));
if (unknown.length) {
  console.error(`✗ unknown phase(s): ${unknown.join(", ")} — known: ${PHASES.join(", ")}`);
  process.exit(2);
}

const plan = STEPS.filter((s) => phases.includes(s.phase));
if (plan.length === 0) {
  console.error(`✗ no steps selected for phase(s): ${phases.join(", ")}`);
  process.exit(2);
}

if (listOnly) {
  for (const s of plan) console.log(`${s.phase}\t${s.cmd.join(" ")}`);
  process.exit(0);
}

for (const step of plan) {
  const label = step.cmd.join(" ");
  console.log(`\n▸ [${step.phase}] ${label}`);
  const r = spawnSync(process.execPath, step.cmd, { cwd: root, stdio: "inherit" });
  if (r.error) {
    console.error(`✗ ${label}: ${r.error.message}`);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error(`✗ ${label} exited ${r.status}`);
    process.exit(r.status ?? 1);
  }
}

console.log(`\n✓ pipeline complete — ${plan.length} step(s) across ${phases.join(" + ")}`);
