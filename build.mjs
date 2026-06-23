#!/usr/bin/env node
// Assemble the static site into dist/.
// Copies the page + the consumed brand assets, so dist/ is self-contained and
// deployable to any static host (GitHub Pages, Cloudflare Pages, Netlify).
import { rm, mkdir, cp, access, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const brand = join(root, "brand");

async function exists(p) { try { await access(p); return true; } catch { return false; } }

if (!(await exists(join(brand, "tokens", "tokens.css")))) {
  console.error("✗ brand/ is empty. Run: git submodule update --init --recursive");
  process.exit(1);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

// Page files
for (const f of ["index.html", "styles.css", "404.html", "llms.txt"]) {
  await cp(join(root, f), join(dist, f));
}

// Only the brand assets the site actually references
await mkdir(join(dist, "brand"), { recursive: true });
for (const p of ["tokens/tokens.css", "css", "mark", "favicon-32.png", "lockup"]) {
  await cp(join(brand, p), join(dist, "brand", p), { recursive: true });
}

// ---- blog ------------------------------------------------------------------

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function inline(raw) {
  // Process inline markdown: bold, italic, inline-code, links.
  // Escape HTML first so content is safe, then apply patterns.
  return esc(raw)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function mdToHtml(md) {
  const lines = md.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence — collect until closing ``` (preserves blank lines inside)
    if (line.startsWith("```")) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      // Trim one leading/trailing blank line from the fence body
      while (codeLines.length && codeLines[0].trim() === "") codeLines.shift();
      while (codeLines.length && codeLines[codeLines.length - 1].trim() === "") codeLines.pop();
      blocks.push({ type: "code", content: codeLines.join("\n") });
      continue;
    }

    // Headings
    if (line.startsWith("### ")) { blocks.push({ type: "h3", content: line.slice(4) }); i++; continue; }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", content: line.slice(3) }); i++; continue; }
    if (line.startsWith("# "))   { blocks.push({ type: "h1", content: line.slice(2) }); i++; continue; }

    // Horizontal rule
    if (line.trim() === "---") { blocks.push({ type: "hr" }); i++; continue; }

    // Empty line
    if (line.trim() === "") { i++; continue; }

    // Paragraph: collect consecutive non-empty, non-fence, non-heading lines
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      lines[i].trim() !== "---"
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) blocks.push({ type: "p", content: paraLines.join(" ") });
  }

  return blocks.map((b) => {
    switch (b.type) {
      case "h1": return `<h1>${inline(b.content)}</h1>`;
      case "h2": return `<h2>${inline(b.content)}</h2>`;
      case "h3": return `<h3>${inline(b.content)}</h3>`;
      case "p":  return `<p>${inline(b.content)}</p>`;
      case "hr": return `<hr>`;
      case "code":
        return `<pre class="code"><code>${esc(b.content)}</code></pre>`;
      default: return "";
    }
  }).join("\n");
}

function postTemplate(title, bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} — Bounded Systems</title>
  <meta name="description" content="${esc(title)}">
  <link rel="canonical" href="https://bounded.tools/blog/">
  <link rel="icon" type="image/png" href="/brand/favicon-32.png">
  <meta name="theme-color" content="#0C5A42">
  <link rel="stylesheet" href="/brand/css/fonts.css">
  <link rel="stylesheet" href="/brand/tokens/tokens.css">
  <link rel="stylesheet" href="/brand/css/base.css">
  <link rel="stylesheet" href="/styles.css">
  <style>html { scroll-behavior: smooth; }</style>
</head>
<body id="top">
  <nav class="nav">
    <div class="nav__inner">
      <a class="lock" href="/">
        <span class="mark mark--rounded" style="width:28px;height:28px;"><img src="/brand/mark/mark-white.svg" width="20" height="20" alt="Bounded Systems"></span>
        <span class="lock__name">bounded.tools</span>
      </a>
      <div class="nav__links">
        <a href="/#bet">The bet</a>
        <a href="/#model">The model</a>
        <a href="/#honesty">Honesty</a>
        <a href="/#proof">Proof</a>
        <a href="/blog/">Writing</a>
        <a class="nav__gh" href="https://github.com/bounded-systems">GitHub&nbsp;&#8599;</a>
      </div>
    </div>
  </nav>
  <main>
    <article class="prose">
      ${bodyHtml}
      <p style="margin-top:48px;"><a href="/blog/">&larr;&nbsp;All writing</a></p>
    </article>
  </main>
</body>
</html>`;
}

function blogIndexTemplate(posts) {
  const items = posts.map(({ slug, title, excerpt }) =>
    `<li class="post-item">
        <a class="post-link" href="/blog/${slug}.html">
          <span class="post-title">${esc(title)}</span>
          ${excerpt ? `<span class="post-excerpt">${esc(excerpt)}</span>` : ""}
        </a>
      </li>`
  ).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Writing — Bounded Systems</title>
  <meta name="description" content="Writing on capability security for agentic systems.">
  <link rel="canonical" href="https://bounded.tools/blog/">
  <link rel="icon" type="image/png" href="/brand/favicon-32.png">
  <meta name="theme-color" content="#0C5A42">
  <link rel="stylesheet" href="/brand/css/fonts.css">
  <link rel="stylesheet" href="/brand/tokens/tokens.css">
  <link rel="stylesheet" href="/brand/css/base.css">
  <link rel="stylesheet" href="/styles.css">
  <style>
    html { scroll-behavior: smooth; }
    .post-list { list-style: none; padding: 0; margin: 36px 0 0; }
    .post-item { border-bottom: 1px solid var(--bs-color-line); }
    .post-link {
      display: block; padding: 22px 0; text-decoration: none;
      color: var(--bs-color-ink);
    }
    .post-link:hover .post-title { color: var(--bs-color-forest); }
    .post-title { display: block; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 6px; }
    .post-excerpt { display: block; font-size: 15px; color: var(--bs-color-ink-mono); line-height: 1.5; }
  </style>
</head>
<body id="top">
  <nav class="nav">
    <div class="nav__inner">
      <a class="lock" href="/">
        <span class="mark mark--rounded" style="width:28px;height:28px;"><img src="/brand/mark/mark-white.svg" width="20" height="20" alt="Bounded Systems"></span>
        <span class="lock__name">bounded.tools</span>
      </a>
      <div class="nav__links">
        <a href="/#bet">The bet</a>
        <a href="/#model">The model</a>
        <a href="/#honesty">Honesty</a>
        <a href="/#proof">Proof</a>
        <a href="/blog/">Writing</a>
        <a class="nav__gh" href="https://github.com/bounded-systems">GitHub&nbsp;&#8599;</a>
      </div>
    </div>
  </nav>
  <main>
    <div class="prose">
      <h1>Writing</h1>
      <p>Thinking on capability security for agents — how agent-authored software stays trustworthy as it grows.</p>
      <ul class="post-list">
        ${items}
      </ul>
    </div>
  </main>
</body>
</html>`;
}

const blogSrcDir = join(root, "blog");
const blogDistDir = join(dist, "blog");
await mkdir(blogDistDir, { recursive: true });

const mdFiles = (await readdir(blogSrcDir))
  .filter((f) => f.endsWith(".md"))
  .sort();

const posts = await Promise.all(
  mdFiles.map(async (filename) => {
    const slug = filename.replace(/\.md$/, "");
    const raw = await readFile(join(blogSrcDir, filename), "utf8");
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : slug;
    // First paragraph after the title as excerpt
    const afterTitle = raw.slice(raw.indexOf("\n") + 1).trimStart();
    const excerptMatch = afterTitle.match(/^(?!#|```|---)(.+)$/m);
    const excerpt = excerptMatch ? excerptMatch[1].replace(/\*\*?([^*]+)\*\*?/g, "$1") : "";
    const bodyHtml = mdToHtml(raw);
    return { slug, title, excerpt, bodyHtml };
  }),
);

for (const { slug, title, bodyHtml } of posts) {
  await writeFile(join(blogDistDir, `${slug}.html`), postTemplate(title, bodyHtml));
}
await writeFile(join(blogDistDir, "index.html"), blogIndexTemplate(posts));

console.log(`✓ built dist/  (deploy this folder)`);
console.log(`✓ built dist/blog/  (${posts.length} posts)`);
