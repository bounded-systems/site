#!/usr/bin/env node
// Project every built page into Markdown.
//
//   node scripts/gen-markdown.mjs           write content/pages/*.md + dist/**/*.md
//   node scripts/gen-markdown.mjs --dist    write only dist/**.md (the served artifact)
//   node scripts/gen-markdown.mjs --check   exit 1 if the committed projection is stale
//
// WHY. The pages are the only place a lot of this prose exists, and HTML is a bad
// medium for reading your own writing: a diff on index.html is markup with
// sentences buried in it, and a page in a browser is laid out to be persuasive
// rather than legible. Markdown is the form you can actually read a site in — in
// a terminal, in a diff, in a review, or by handing it to something that reads.
//
// It also makes repetition visible, which is what prompted this. The homepage
// says "every claim on this page is graded against the running code" three times
// in three phrasings; scattered across 400 lines of markup, that is invisible,
// and in 60 lines of prose it is obvious. check-repetition.mjs reads this output
// and puts a number on it.
//
// ONE RULE, TWO CASES. Every page gets a .md at the same route, and it always
// says what THAT PAGE says:
//   - a page authored in Markdown (blog/*.md) serves its SOURCE. Projecting the
//     HTML back would create a second copy of the same post to keep in sync,
//     which is the exact failure this whole change is about.
//   - every other page is projected from its BUILT html, so generated regions
//     (the nav, /map, /desk, /ledger, /conformance) are in it. Projecting the
//     source files instead would silently omit the majority of some pages.
//
// The projected files are COMMITTED under content/pages/ and drift-checked, the
// same as every other projection in this repo (gen-seams, gen-map, gen-desk,
// gen-ledger). That is the diffability half: a copy change shows up in review as
// a prose diff next to the markup one. Blog posts are not committed twice — the
// source already is.
//
// The HTML parser here is small and deliberately unambitious. It handles the tags
// this site actually uses; anything else degrades to its text content rather than
// throwing, because a projection that fails closed on an unknown tag would block
// the build over a formatting detail.
import { mkdir, readdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(root, "dist");
const PAGES = join(root, "content", "pages");
const BLOG_SRC = join(root, "blog");
const CHECK = process.argv.includes("--check");
const DIST_ONLY = process.argv.includes("--dist");

// --- a very small HTML reader ------------------------------------------------
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW = new Set(["script", "style"]);

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·",
  rarr: "→", larr: "←", darr: "↓", uarr: "↑", hellip: "…", mdash: "—", ndash: "–",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", times: "×", check: "✓",
};
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") return String.fromCodePoint(parseInt(e[1] === "x" || e[1] === "X" ? e.slice(2) : e.slice(1), e[1] === "x" || e[1] === "X" ? 16 : 10));
  return ENTITIES[e.toLowerCase()] ?? m;
});

// Returns a tree of {tag, attrs, children} / {text}. Unclosed tags are tolerated:
// a close tag with no matching open is dropped rather than unwinding the stack,
// because one stray </div> in a generated region should not reshape a whole page.
function parse(html) {
  const rootNode = { tag: "#root", attrs: {}, children: [] };
  const stack = [rootNode];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)\/?>/g;
  let last = 0;
  let m;
  const push = (n) => stack[stack.length - 1].children.push(n);
  const text = (s) => { if (s) push({ text: decode(s) }); };

  while ((m = re.exec(html))) {
    text(html.slice(last, m.index));
    last = re.lastIndex;
    if (m[0].startsWith("<!--")) continue;
    if (m[1]) {
      const tag = m[1].toLowerCase();
      const i = stack.findLastIndex((n) => n.tag === tag);
      if (i > 0) stack.length = i;
      continue;
    }
    const tag = m[2].toLowerCase();
    const attrs = {};
    for (const a of m[3].matchAll(/([\w-]+)\s*=\s*"([^"]*)"|([\w-]+)\s*=\s*'([^']*)'|([\w-]+)/g)) {
      const k = (a[1] || a[3] || a[5]).toLowerCase();
      attrs[k] = decode(a[2] ?? a[4] ?? "");
    }
    const node = { tag, attrs, children: [] };
    push(node);
    if (RAW.has(tag)) {
      const close = html.toLowerCase().indexOf(`</${tag}`, re.lastIndex);
      re.lastIndex = last = close === -1 ? html.length : html.indexOf(">", close) + 1;
      continue;
    }
    if (!VOID.has(tag) && !m[0].endsWith("/>")) stack.push(node);
  }
  text(html.slice(last));
  return rootNode;
}

const find = (node, pred) => {
  if (pred(node)) return node;
  for (const c of node.children || []) {
    const hit = find(c, pred);
    if (hit) return hit;
  }
  return null;
};
const textOf = (node) => (node.text !== undefined ? node.text : (node.children || []).map(textOf).join(""));

// --- HTML → Markdown ---------------------------------------------------------
const BLOCK = new Set([
  "address", "article", "aside", "blockquote", "details", "div", "dl", "dd", "dt",
  "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4",
  "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section",
  "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
]);
// Interactive or purely decorative — nothing to read.
const DROP = new Set(["button", "input", "select", "textarea", "svg", "script", "style", "noscript"]);
// Tags that carry their own structure and must never be flattened into one line
// by the term/definition pairing below.
const PAIR_EXCLUDE = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "pre", "ul", "ol", "table", "dl", "details", "blockquote", "hr"]);

const collapse = (s) => s.replace(/[ \t\r\n]+/g, " ");
const esc = (s) => s.replace(/([\\`*_[\]])/g, "\\$1");

// Join an element's children, inserting a space where two element siblings sit
// flush against each other in the source.
//
// The site has several run-together pairs that CSS separates and markup does
// not — `<span class="defn__term">room</span><span class="defn__body">a named
// bundle…</span>` is a description list wearing spans, and the legend does the
// same. Concatenated verbatim they read "rooma named bundle". Whitespace is the
// only separator plain text has, so a boundary between two elements gets one.
//
// This is a formatting normalization, not a guess about meaning: it never
// changes which words appear, only that two of them do not fuse. Where the page
// genuinely wants no gap — `<b>fs</b><code>()</code>` — a joined form would be
// wrong, so the space goes in only between two ELEMENT siblings that both render
// text, never around inline code or punctuation-only runs.
function joinChildren(children, render) {
  let out = "";
  let prevWasElement = false;
  for (const c of children) {
    const piece = render(c);
    const isElement = c.text === undefined;
    if (
      piece && out && isElement && prevWasElement &&
      !/\s$/.test(out) && !/^\s/.test(piece) &&
      !/^[`([{,.;:!?)\]}]/.test(piece) && !/[`([{]$/.test(out)
    ) out += " ";
    out += piece;
    if (piece) prevWasElement = isElement;
  }
  return out;
}

// Serialize inline content: text runs plus the few inline tags the site uses.
function inline(node) {
  if (node.text !== undefined) return esc(collapse(node.text));
  if (DROP.has(node.tag)) return "";
  const kids = () => joinChildren(node.children || [], inline);
  switch (node.tag) {
    case "br": return "\n";
    case "code": return "`" + collapse(textOf(node)).trim() + "`";
    case "strong": case "b": {
      const t = kids().trim();
      return t ? `**${t}**` : "";
    }
    case "em": case "i": {
      const t = kids().trim();
      return t ? `*${t}*` : "";
    }
    case "a": {
      const t = kids().trim();
      const href = node.attrs.href;
      if (!t) return "";
      return href ? `[${t}](${href})` : t;
    }
    case "img": {
      const alt = (node.attrs.alt || "").trim();
      return alt ? `![${esc(alt)}](${node.attrs.src || ""})` : ""; // empty alt = decorative
    }
    default: return kids();
  }
}

function cell(node) {
  return inline(node).replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

// Serialize a node into markdown blocks. `out` collects block strings.
function block(node, out, depth = 0) {
  if (node.text !== undefined) {
    const t = collapse(node.text).trim();
    if (t) out.push(esc(t));
    return;
  }
  if (DROP.has(node.tag)) return;

  const children = node.children || [];
  const hasBlockChild = children.some((c) => c.tag && BLOCK.has(c.tag));

  switch (node.tag) {
    case "h1": case "h2": case "h3": case "h4": case "h5": case "h6": {
      const t = inline(node).replace(/\s+/g, " ").trim();
      if (t) out.push("#".repeat(Number(node.tag[1])) + " " + t);
      return;
    }
    case "hr": out.push("---"); return;
    case "pre": {
      // Code, not prose: take the raw text, drop the syntax-highlight spans.
      const code = textOf(node).replace(/\u00a0/g, " ").replace(/^\n+|\s+$/g, "");
      if (code) out.push("```\n" + code + "\n```");
      return;
    }
    case "blockquote": {
      const inner = [];
      for (const c of children) block(c, inner, depth);
      if (inner.length) out.push(inner.join("\n\n").split("\n").map((l) => (l ? "> " + l : ">")).join("\n"));
      return;
    }
    case "ul": case "ol": {
      const marker = (i) => (node.tag === "ol" ? `${i + 1}. ` : "- ");
      const items = [];
      let i = 0;
      for (const li of children.filter((c) => c.tag === "li")) {
        const inner = [];
        for (const c of li.children || []) block(c, inner, depth + 1);
        const body = (inner.length ? inner : [inline(li).trim()]).filter(Boolean).join("\n\n");
        if (!body) continue;
        const pad = " ".repeat(marker(i).length);
        items.push(marker(i) + body.split("\n").map((l, k) => (k === 0 ? l : pad + l)).join("\n"));
        i++;
      }
      if (items.length) out.push(items.join("\n"));
      return;
    }
    case "dl": {
      // A definition list reads as "**term** — definition"; a table would be
      // heavier than the content and a bare list loses the pairing.
      const lines = [];
      let term = null;
      for (const c of children) {
        if (c.tag === "dt") term = inline(c).replace(/\s+/g, " ").trim();
        else if (c.tag === "dd") {
          const d = inline(c).replace(/\s+/g, " ").trim();
          lines.push(term ? `- **${term}** — ${d}` : `- ${d}`);
          term = null;
        }
      }
      if (lines.length) out.push(lines.join("\n"));
      return;
    }
    case "table": {
      const rows = [];
      const walkRows = (n) => {
        for (const c of n.children || []) {
          if (c.tag === "tr") rows.push(c);
          else if (["thead", "tbody", "tfoot"].includes(c.tag)) walkRows(c);
        }
      };
      walkRows(node);
      if (!rows.length) return;
      const cells = rows.map((r) => (r.children || []).filter((c) => c.tag === "td" || c.tag === "th").map(cell));
      const width = Math.max(...cells.map((r) => r.length));
      const pad = (r) => { const c = r.slice(); while (c.length < width) c.push(""); return c; };
      const head = pad(cells[0]);
      const body = cells.slice(1).map(pad);
      out.push([
        "| " + head.join(" | ") + " |",
        "|" + head.map(() => " --- ").join("|") + "|",
        ...body.map((r) => "| " + r.join(" | ") + " |"),
      ].join("\n"));
      return;
    }
    case "details": {
      const sum = children.find((c) => c.tag === "summary");
      const inner = [];
      for (const c of children) if (c !== sum) block(c, inner, depth);
      // A disclosure is still content. Mark it as one so a reader knows this text
      // is folded away on the page rather than sitting in front of them.
      if (sum) out.push(`**▸ ${inline(sum).replace(/\s+/g, " ").trim()}** *(collapsed on the page)*`);
      out.push(...inner);
      return;
    }
    case "p": {
      const t = inline(node).replace(/[ \t]+/g, " ").trim();
      if (t) out.push(t);
      return;
    }
    default: {
      const cls0 = (c) => (c.attrs && c.attrs.class) || "";
      const looseText = children.some((c) => c.text !== undefined && c.text.trim());
      const elems = children.filter((c) => c.text === undefined && !DROP.has(c.tag));

      if (hasBlockChild) {
        // The same term/definition shape as below, but built from block children:
        // `<div class="stat"><div class="stat__n">72</div><div class="stat__l">
        // repos</div></div>`, and every `.seam` and `.tile` on the site. Left
        // alone each half becomes its own paragraph, so a stats strip reads as
        // "72 / repos / 5 / checked" down the page with the pairing lost.
        const pairable = (c) =>
          !PAIR_EXCLUDE.has(c.tag) && !(c.children || []).some((g) => g.tag && BLOCK.has(g.tag));
        if (!looseText && elems.length === 2 && elems.every(pairable) && new Set(elems.map(cls0)).size === 2) {
          const a = inline(elems[0]).replace(/\s+/g, " ").trim();
          const b = inline(elems[1]).replace(/\s+/g, " ").trim();
          if (a && b) { out.push(`**${a}** — ${b}`); return; }
        }
        for (const c of children) block(c, out, depth);
        return;
      }
      // Two shapes the markup never named, both of which fuse into a sentence
      // that was never written if rendered as one run. The site is consistently
      // BEM, so the CLASS tells them apart:
      //
      //   same class on every sibling  → peers, i.e. a list. The hero's
      //     `guest = your agent` / `door = one capability` pills; the CTA pair.
      //   two siblings, different class → a term and its definition. The
      //     room/door/guest block is `<span class="defn__term">room</span>
      //     <span class="defn__body">a named bundle…</span>` — a description
      //     list wearing spans, which is worth fixing in the HTML and is not
      //     this script's job to fix.
      //
      // Loose text disqualifies both: `<span><a>Sigstore</a> · <a>OIDC</a></span>`
      // brought its own separator and stays inline.
      const els = elems;
      const loose = looseText;
      const cls = cls0;
      if (!loose && els.length >= 2 && new Set(els.map((c) => c.tag)).size === 1) {
        const parts = els.map((c) => inline(c).replace(/\s+/g, " ").trim()).filter(Boolean);
        if (parts.length >= 2 && new Set(els.map(cls)).size === 1) {
          out.push(parts.map((i) => "- " + i).join("\n"));
          return;
        }
        if (parts.length === 2 && els.length === 2) {
          out.push(`**${parts[0]}** — ${parts[1]}`);
          return;
        }
      }
      const t = inline(node).replace(/[ \t]+/g, " ").trim();
      if (t) out.push(t);
    }
  }
}

// The honesty stamp ("graded against commit 1b2becb · 2026-08-21") is rewritten
// by gen-stamp on every build. Carrying it into a COMMITTED projection would
// make that file stale the moment anything else merges, so it is dropped: it is
// build metadata, not prose, and the page itself is where you read it. Dropping
// it also makes the projection a pure function of the source, which is what lets
// --check mean anything.
const STAMP = /<!--\s*stamp:start\s*-->[\s\S]*?<!--\s*stamp:end\s*-->/gi;

function toMarkdown(html, { route }) {
  const tree = parse(html.replace(STAMP, ""));
  const main = find(tree, (n) => n.tag === "main") || find(tree, (n) => n.tag === "body") || tree;
  const titleEl = find(tree, (n) => n.tag === "title");
  const title = titleEl ? collapse(textOf(titleEl)).trim() : route;

  const out = [];
  block(main, out);
  const body = out.filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();

  // The provenance line lives in a COMMENT, not in the body. A visible header
  // repeated verbatim on every page is boilerplate, and check-repetition counted
  // it as exactly that the first time it ran — thirteen pages saying "projected
  // from the built HTML" drowned the findings the report exists to surface. The
  // page's own <h1> is the title; the route is in the filename.
  return [
    `<!-- ${title}`,
    `     ${route} — projected from the built page by scripts/gen-markdown.mjs.`,
    `     Do not edit: change the page (or its generator) and rebuild. -->`,
    ``,
    body,
    ``,
  ].join("\n");
}

// --- walk --------------------------------------------------------------------
async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

const htmlFiles = (await walk(DIST)).filter((f) => f.endsWith(".html")).sort();
if (!htmlFiles.length) {
  console.error("✗ gen-markdown: dist/ has no HTML — run the build first.");
  process.exit(1);
}

// Pages authored in Markdown keep their source as the served .md.
const authored = new Set();
try {
  for (const f of await readdir(BLOG_SRC)) if (f.endsWith(".md")) authored.add(`blog/${f}`);
} catch { /* no blog sources */ }

const projected = new Map(); // repo-relative md path → content
const served = new Map(); // dist-relative md path → content

for (const file of htmlFiles) {
  const rel = relative(DIST, file).split("\\").join("/");
  const mdRel = rel.replace(/\.html$/, ".md");
  if (authored.has(mdRel)) continue; // handled below, straight from source
  const route = "/" + rel.replace(/index\.html$/, "").replace(/\.html$/, "");
  const md = toMarkdown(await readFile(file, "utf8"), { route });
  projected.set(mdRel, md);
  served.set(mdRel, md);
}

for (const mdRel of authored) {
  served.set(mdRel, await readFile(join(root, mdRel), "utf8"));
}

// --- --check: is the committed projection current? ---------------------------
if (CHECK) {
  let stale = 0;
  const seen = new Set();
  for (const [mdRel, md] of projected) {
    seen.add(mdRel);
    let have = null;
    try { have = await readFile(join(PAGES, mdRel), "utf8"); } catch { /* missing */ }
    if (have !== md) {
      console.error(`✗ content/pages/${mdRel} is ${have === null ? "missing" : "stale"}`);
      stale++;
    }
  }
  let existing = [];
  try { existing = (await walk(PAGES)).map((f) => relative(PAGES, f).split("\\").join("/")); } catch { /* not created yet */ }
  for (const f of existing) {
    if (f.endsWith(".md") && !seen.has(f)) {
      console.error(`✗ content/pages/${f} has no page behind it any more — delete it`);
      stale++;
    }
  }
  if (stale) {
    console.error(`✗ gen-markdown: ${stale} projected page(s) out of date — run: node scripts/gen-markdown.mjs`);
    process.exit(1);
  }
  console.log(`✓ gen-markdown: ${projected.size} projected page(s) in sync with the built HTML`);
  process.exit(0);
}

// --- write -------------------------------------------------------------------
// `--dist` writes only the served artifact, never the repo — the same split
// gen-ledger uses. The pipeline's hermetic phase produces dist/**.md so the
// signed whole-site manifest covers it; the local phase refreshes the committed
// projection under content/pages/, which is repo codegen and never deployed.
if (!DIST_ONLY) {
  await rm(PAGES, { recursive: true, force: true });
  for (const [mdRel, md] of projected) {
    const dest = join(PAGES, mdRel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, md);
  }
}
for (const [mdRel, md] of served) {
  const dest = join(DIST, mdRel);
  await mkdir(dirname(dest), { recursive: true });
  if (authored.has(mdRel)) await copyFile(join(root, mdRel), dest);
  else await writeFile(dest, md);
}

// Discoverability: without an index you have to guess that /map.md exists.
// llms.txt is exactly the file that is supposed to answer "what can I read
// here", so the routes are appended to it rather than given a new home. The
// block is regenerated from scratch each build, so it cannot drift from what was
// actually written, and the hand-written part of llms.txt is left alone.
const LLMS_MARK = "## Pages, as Markdown";
const llmsPath = join(DIST, "llms.txt");
try {
  const before = (await readFile(llmsPath, "utf8")).split(LLMS_MARK)[0].replace(/\s+$/, "");
  const routes = [...served.keys()].sort().map((mdRel) => {
    const route = "/" + mdRel;
    const page = "/" + mdRel.replace(/index\.md$/, "").replace(/\.md$/, "");
    return `- [${page}](https://bounded.tools${route})`;
  });
  await writeFile(llmsPath, `${before}\n\n${LLMS_MARK}\nEvery page is also served as Markdown at the same route with a \`.md\` suffix.\n${routes.join("\n")}\n`);
} catch {
  console.warn("  · dist/llms.txt not present — skipping the markdown index");
}

const words = [...served.values()].reduce((n, s) => n + s.split(/\s+/).filter(Boolean).length, 0);
console.log(
  `✓ gen-markdown: ${served.size} page(s) → markdown ` +
  `(${projected.size} projected, ${authored.size} served from source) · ${words} words` +
  (DIST_ONLY ? " · dist only" : ""),
);
