#!/usr/bin/env node
// Subresource Integrity — pin every self-hosted <script src> / <link rel=stylesheet>
// by its sha384 content hash, so a browser refuses a subresource whose bytes don't
// match. Defense-in-depth alongside the signed whole-site manifest, but enforced by
// the browser. Deterministic (content hashes); must run BEFORE the Repr-Digest/manifest
// so the integrity attributes are part of the signed bytes.
//
//   node scripts/add-sri.mjs [distDir]   # default: dist
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname, normalize } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, process.argv[2] || "dist");

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(abs));
    else out.push(abs);
  }
  return out;
}

const hashCache = new Map();
async function sri(absPath) {
  if (!hashCache.has(absPath)) {
    const bytes = await readFile(absPath); // throws if missing → caller skips
    hashCache.set(absPath, "sha384-" + createHash("sha384").update(bytes).digest("base64"));
  }
  return hashCache.get(absPath);
}

// Resolve a relative href on `htmlFile` to a dist asset path; null for off-graph (external).
function resolveAsset(href, htmlFile) {
  if (/^(https?:|\/\/|data:|mailto:|#)/i.test(href)) return null;
  const p = href.split("#")[0].split("?")[0];
  if (!p) return null;
  return p.startsWith("/") ? join(dist, p.slice(1)) : normalize(join(dirname(htmlFile), p));
}

async function replaceAsync(str, re, fn) {
  const parts = [];
  let last = 0, m;
  re.lastIndex = 0;
  while ((m = re.exec(str))) {
    parts.push(str.slice(last, m.index), await fn(...m));
    last = m.index + m[0].length;
  }
  parts.push(str.slice(last));
  return parts.join("");
}

let count = 0, pages = 0;
for (const htmlFile of (await walk(dist)).filter((f) => f.endsWith(".html"))) {
  let changed = false;
  const html = await replaceAsync(
    await readFile(htmlFile, "utf8"),
    /<(script|link)\b([^>]*)>/gi,
    async (whole, el, attrs) => {
      if (/\bintegrity=/.test(attrs)) return whole; // already pinned
      const isScript = el.toLowerCase() === "script";
      if (!isScript && !/\brel="[^"]*stylesheet/i.test(attrs)) return whole; // only stylesheet links
      const m = attrs.match(isScript ? /\bsrc="([^"]+)"/ : /\bhref="([^"]+)"/);
      if (!m) return whole;
      const asset = resolveAsset(m[1], htmlFile);
      if (!asset || !/\.(js|css)$/.test(asset)) return whole; // external / non-asset
      let hash;
      try { hash = await sri(asset); } catch { return whole; } // asset not built → skip
      changed = true; count++;
      return `<${el}${attrs} integrity="${hash}">`;
    },
  );
  if (changed) { await writeFile(htmlFile, html); pages++; }
}
console.log(`✓ add-sri: pinned ${count} subresource(s) with sha384 integrity across ${pages} page(s)`);
