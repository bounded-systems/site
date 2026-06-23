#!/usr/bin/env node
// Stamp the honesty section with the commit the page was built from, so
// "graded against the running code" points at a specific, linkable SHA.
// Prefers the Cloudflare deploy commit; falls back to git HEAD. Run at build.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Stamp the BUILT output, not the source — the source keeps the placeholder.
const { existsSync } = await import("node:fs");
const file = existsSync(join(root, "dist", "index.html")) ? join(root, "dist", "index.html") : join(root, "index.html");

const sha =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
const short = sha.slice(0, 7);
const date = new Date().toISOString().slice(0, 10);
const repo = process.env.GITHUB_REPOSITORY || "bounded-systems/site";
const url = `https://github.com/${repo}/commit/${sha}`;
const stamp = `graded against <a href="${url}" style="color:inherit;">commit ${short}</a> &middot; ${date}`;

const html = readFileSync(file, "utf8").replace(
  /<!-- stamp:start -->[\s\S]*?<!-- stamp:end -->/,
  `<!-- stamp:start -->${stamp}<!-- stamp:end -->`,
);
writeFileSync(file, html);
console.log(`stamped honesty section: ${short} (${date})`);
