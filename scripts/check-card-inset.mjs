#!/usr/bin/env node
// Rendered-layout gate: no card's text may touch the card's own border.
//
//   node scripts/check-card-inset.mjs [distDir]
//
// WHY THIS EXISTS. `.card` in styles.css supplies only a SURFACE — background,
// border, radius. The inset is each card variant's own job: `.proof-card`,
// `.start-here`, `.seams` each declare a padding. Two of them did not
// (`.provenance`, on the homepage), and because no `.provenance` rule existed
// at all there was nothing to notice: the class was simply absent from the
// stylesheet, so the copy rendered flush against the 1px border with the
// corner radius cutting into the first line, and stacked siblings doubled
// their borders into a seam. It shipped, and a reader on an iPad found it
// (site issue 215).
//
// Those two cards no longer exist — the homepage rewrite (site issue 219) cut
// them — so this gate no longer has the defect that motivated it to guard. It
// ships anyway: `.card` is still used by the three repo cards and the try-it
// card on the homepage, and across /map, /desk, /contracts and /conformance,
// and the failure mode is a class that forgets to declare an inset. Retiring a
// gate because its first catch was fixed is how the second one ships.
//
// Every gate already in this repo would have let it through again, and each
// for a defensible reason: axe scores the accessibility tree and does not
// score whitespace; the visual sweep in site issue 209 looked for horizontal
// OVERFLOW, which this is the opposite of; the density gate reads words. So
// this is not a stricter version of an existing check — it is a missing one.
//
// The predicate is deliberately about the RENDERED BOX, not about the CSS.
// A stylesheet check ("every class matching /card/ declares a padding") is a
// proxy: it passes when the padding is declared and then overridden, and fails
// when a variant legitimately insets its children instead of itself. This
// measures the thing the reader actually sees — where the glyphs land relative
// to the border — using the same real-browser machinery the axe gate already
// depends on for the same reason (layout is not derivable from markup).
//
// PREDICATE. For every element carrying the `card` class in every built page:
// no text rendered inside it may come within MIN_INSET px of that card's own
// border box, on any side. Text is measured with Range rects over text nodes,
// not element boxes, so a full-bleed child that pads its own text (a code
// block, a scrolling table) passes on its merits rather than by exemption.
//
// Config, so nothing about this one site is baked in:
//   argv[2] / $DIST         built output dir           (default: "dist")
//   $CARD_SELECTOR          what counts as a card      (default: ".card")
//   $CARD_MIN_INSET         px of breathing room       (default: 12)
//   $CARD_PAGES             comma list of pages        (default: every *.html)
//   $CARD_BROWSER_PATH      Chromium binary to drive    (default: Playwright's own)
//                           — for sandboxes that ship a browser Playwright did
//                           not download and cannot fetch one.
//
// Exceptions live in content/card-inset-allowlist.json, each with a reason —
// same shape as the overclaim allowlist. An empty allowlist is the goal state.
import { readdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, relative, sep } from "node:path";

const DIST = process.argv[2] || process.env.DIST || "dist";
const SELECTOR = process.env.CARD_SELECTOR || ".card";
const MIN_INSET = Number(process.env.CARD_MIN_INSET || 12);
const ALLOWLIST = join("content", "card-inset-allowlist.json");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jsonld": "application/ld+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
};

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

// Serve dist over a real origin. file:// would strip absolute asset paths and
// fabricate a layout with no stylesheet — every card would "fail" for the wrong
// reason, which is worse than not running.
//
// ALLOWLIST, NOT A FILTER. The first version of this built a path out of the
// request — `join(root, req.url)` — which resolves `..` happily:
// join("dist", "/../../../../etc/passwd") is /etc/passwd. CodeQL flagged it and
// CodeQL was right. The obvious repair is to resolve the path and refuse
// anything that lands outside the root, and that is a FILTER: it works only as
// long as it enumerates every way a path can escape, and it fails open when it
// misses one. (It also did not convince CodeQL, because the check sat behind a
// helper — but "the scanner accepted it" was never the goal.)
//
// So the request path never becomes a filesystem path at all. `dist` is walked
// once, and the result is a map from route to the file that was actually found
// there. A request can only ever look something up in that map; a route that is
// not in it is 404, whatever it is spelled like. This is the same reasoning the
// org's public feed filter uses — unknown is not permission — and it has the
// property a filter cannot: an escape the author never thought of has nothing
// to escape INTO, because no path is ever derived from the input.
async function serve(root, files) {
  const routes = new Map();
  for (const f of files) {
    const rel = "/" + relative(root, f).split(sep).join("/");
    routes.set(rel, f);
    if (rel.endsWith("/index.html")) routes.set(rel.slice(0, -"index.html".length), f);
  }
  const srv = createServer(async (req, res) => {
    let p;
    try {
      p = decodeURIComponent((req.url || "/").split("?")[0]);
    } catch {
      res.writeHead(400);
      return res.end("bad request"); // malformed percent-encoding
    }
    // Extensionless routes (`/map`) resolve the same way the deployed site does.
    const file = routes.get(p) ?? routes.get(`${p}.html`) ?? routes.get(`${p}/`);
    if (file === undefined) {
      res.writeHead(404);
      return res.end("not found");
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { srv, base: `http://127.0.0.1:${srv.address().port}` };
}

// Runs in the page. Returns one entry per card whose text crowds its border.
function measure({ selector, minInset }) {
  const label = (el) => {
    const cls = String(el.className || "").trim().split(/\s+/).filter(Boolean).join(".");
    return (el.id ? `#${el.id}` : "") + (cls ? `.${cls}` : "") || el.tagName.toLowerCase();
  };
  const out = [];
  for (const card of document.querySelectorAll(selector)) {
    const box = card.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue; // not rendered (a closed <details>, display:none)
    let worst = null;
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.nodeValue || !n.nodeValue.trim()) continue;
      // Text belonging to a NESTED card is that card's problem, not this one's.
      if (n.parentElement.closest(selector) !== card) continue;
      const cs = getComputedStyle(n.parentElement);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width === 0 || r.height === 0) continue;
        const gaps = {
          left: r.left - box.left,
          right: box.right - r.right,
          top: r.top - box.top,
          bottom: box.bottom - r.bottom,
        };
        for (const [side, gap] of Object.entries(gaps)) {
          if (gap >= minInset) continue;
          if (!worst || gap < worst.gap) {
            worst = {
              gap: Math.round(gap * 10) / 10,
              side,
              text: n.nodeValue.trim().slice(0, 60),
            };
          }
        }
      }
    }
    if (worst) out.push({ card: label(card), ...worst });
  }
  return out;
}

// --- main -------------------------------------------------------------------
const { chromium } = await import("playwright");

const assets = await walk(DIST);                       // everything the pages reference
const files = assets.filter((f) => f.endsWith(".html")); // the pages themselves
const pages = process.env.CARD_PAGES
  ? process.env.CARD_PAGES.split(",").map((s) => s.trim()).filter(Boolean)
  : files.map((f) => "/" + relative(DIST, f).split("\\").join("/"));

let allow = [];
try {
  allow = JSON.parse(await readFile(ALLOWLIST, "utf8")).allow || [];
} catch {
  /* no allowlist is the goal state, not an error */
}
const allowed = new Set(allow.map((a) => `${a.page} ${a.card}`));

const { srv, base } = await serve(DIST, assets);
const browser = await chromium.launch(
  process.env.CARD_BROWSER_PATH ? { executablePath: process.env.CARD_BROWSER_PATH } : {},
);
// Two widths, because this failure hides at one of them: a card with no inset
// still looks survivable on a wide desktop column and reads as broken on a
// phone, which is the viewport the report came from.
const WIDTHS = [390, 1280];

const findings = [];
let cards = 0;
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    // Open every disclosure: content behind a <details> is content, and it is
    // exactly where the hand-styled summaries were hiding.
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
    await page.waitForTimeout(50);
    cards += await page.evaluate((s) => document.querySelectorAll(s).length, SELECTOR);
    for (const f of await page.evaluate(measure, { selector: SELECTOR, minInset: MIN_INSET })) {
      findings.push({ page: path, width: w, ...f });
    }
  }
  await ctx.close();
}
await browser.close();
srv.close();

const blocking = findings.filter((f) => !allowed.has(`${f.page} ${f.card}`));
const waived = findings.length - blocking.length;

if (blocking.length) {
  console.error(`✗ card-inset: ${blocking.length} card(s) render text within ${MIN_INSET}px of their own border.\n`);
  for (const f of blocking) {
    console.error(`  ${f.page} @${f.width}px  ${f.card}`);
    console.error(`    ${f.side} gap ${f.gap}px — "${f.text}"`);
  }
  console.error(`\n  A card class with no inset of its own is the usual cause: .card supplies the`);
  console.error(`  surface only. Give the variant a padding, or record a reason in ${ALLOWLIST}.`);
  process.exit(1);
}

console.log(
  `✓ card-inset: ${cards} card render(s) across ${pages.length} page(s) × ${WIDTHS.length} width(s); ` +
  `all text ≥${MIN_INSET}px clear of its border${waived ? ` (${waived} waived by allowlist)` : ""}.`,
);
