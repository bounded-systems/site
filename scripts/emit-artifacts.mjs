#!/usr/bin/env node
// emit-artifacts — write the standards-compliant sidecar artifacts onto the built
// dist/, using the vendored conformance-kit emitters (pure helpers; all values
// injected here so the kit stays site-agnostic).
//
//   node scripts/emit-artifacts.mjs        # operates on ./dist
//   DIST=out node scripts/emit-artifacts.mjs
//
// Additive only — it never rewrites an existing page. It emits:
//   • /.well-known/security.txt   RFC 9116 security-contact channel (Expires one
//                                 year out, so a weekly rebuild rolls it forward).
//   • /site.webmanifest           W3C web app manifest, themed from the brand colour.
//   • /_headers                   Cloudflare response headers: a Content-Type rule
//                                 for the .md siblings + the manifest, plus an RFC
//                                 9530 Repr-Digest per canonical HTML route, computed
//                                 over the exact served bytes.
//
// Run at DEPLOY time, AFTER gen-stamp + gen-blog (so index.html carries its final
// stamped bytes and every blog post exists) and BEFORE gen-sitemanifest, so the
// signed whole-site manifest covers security.txt + site.webmanifest. _headers is a
// Cloudflare control file (excluded from the manifest, served as config, not bytes),
// so its wall-clock-independent digests stay honest against the served documents.
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { reprDigest, securityTxt, securityTxtExpires, webManifest, markdownSiblingHeaders } from "../vendor/conformance-kit/emitters/index.mjs";

const dist = resolve(process.cwd(), process.env.DIST || "dist");
const SITE = "https://bounded.tools";
const CONTACT = "mailto:hello@bounded.tools";
const THEME = "#0C5A42"; // brand forest — matches index.html <meta name="theme-color">

// --- /.well-known/security.txt (RFC 9116) -------------------------------------
const secTxt = securityTxt({
  contact: CONTACT,
  canonical: `${SITE}/.well-known/security.txt`,
  expires: securityTxtExpires(),
  preferredLanguages: ["en"],
});
await mkdir(join(dist, ".well-known"), { recursive: true });
await writeFile(join(dist, ".well-known", "security.txt"), secTxt);

// --- /site.webmanifest (W3C web app manifest) ---------------------------------
// Description mirrors index.html's <meta name="description"> so the two can't drift.
const indexHtml = await readFile(join(dist, "index.html"), "utf8");
const description = (indexHtml.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] || "").trim();
const manifest = webManifest({
  name: "Bounded Systems",
  shortName: "bounded.tools",
  description,
  themeColor: THEME,
  backgroundColor: THEME,
  display: "standalone",
  startUrl: "/",
  icons: [
    { src: "/brand/mark/mark-forest-1024.png", sizes: "1024x1024", type: "image/png" },
    { src: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
  ],
});
await writeFile(join(dist, "site.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");

// --- /_headers (Content-Type rules + RFC 9530 Repr-Digest per route) -----------
// Map each served HTML route to the digest of its exact served bytes. Cloudflare's
// html_handling serves /index.html at "/", /blog/index.html at "/blog/", and
// /blog/<slug>.html at "/blog/<slug>".
const posts = (await readdir(join(dist, "blog"), { withFileTypes: true }))
  .filter((e) => e.isFile() && e.name.endsWith(".html") && e.name !== "index.html")
  .map((e) => e.name)
  .sort();

const routes = [
  ["/", join(dist, "index.html")],
  ["/blog/", join(dist, "blog", "index.html")],
  ...posts.map((f) => [`/blog/${f.replace(/\.html$/, "")}`, join(dist, "blog", f)]),
];

// HTML caching policy — a fixed CONSTANT (no clock/derived value, so the build stays
// deterministic + reproducible). `s-maxage=120` lets the Cloudflare edge cache HTML for
// 120s so it can answer `If-None-Match` with a `304` FROM CACHE (Cloudflare generates the
// strong ETag once HTML is cache-eligible — see the `respect_strong_etags` cache rule in
// bounded-systems/infra cloudflare/terraform). `max-age=0, must-revalidate` keeps BROWSERS
// always-fresh (they revalidate every visit, getting a cheap 304 — no client staleness).
// We do NOT declare an ETag here: Cloudflare's cache-generated one is what's served. The
// policy lives in this deterministic artifact, not a CF-side TTL knob (which respect_origin).
const HTML_CACHE_CONTROL = "public, max-age=0, s-maxage=120, must-revalidate";

const blocks = [];
for (const [route, file] of routes) {
  blocks.push(`${route}\n  Cache-Control: ${HTML_CACHE_CONTROL}\n  Repr-Digest: ${reprDigest(await readFile(file))}`);
}

const headers = blocks.join("\n") + "\n" + markdownSiblingHeaders();
await writeFile(join(dist, "_headers"), headers);

console.log(`✓ artifacts: /.well-known/security.txt · /site.webmanifest · /_headers (${routes.length} Repr-Digest route(s)) → ${process.env.DIST || "dist"}/`);
