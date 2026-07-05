#!/usr/bin/env node
// gen-prose-corpus — build the corpora the proxy gates read, kept LAYER-CORRECT:
//   prose-corpus.json  page copy (index/404) + blog markdown — for word-choice
//                      gates (claim-discipline, grammar-repetition) that apply to
//                      ALL prose.
//   doc-corpus.json    the COMPOSED docs only (blog/*.md) — for doc-scope
//                      (one-topic + length), which judges a document, not a
//                      landing page. A page is a different shape; don't check it
//                      as if it were an essay.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const stripHtml = (s) => s.replace(/<(script|style|pre|code)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
const stripMd = (s) => s.replace(/^---[\s\S]*?---/, "").replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ").replace(/[#>*_\[\]()!|-]/g, " ");

const pages = {}, docs = {};
for (const f of ["index.html", "404.html"]) {
  try { pages[f] = stripHtml(await readFile(join(ROOT, f), "utf8")); } catch {}
}
try {
  for (const f of await readdir(join(ROOT, "blog"))) {
    if (f.endsWith(".md")) docs[`blog/${f}`] = stripMd(await readFile(join(ROOT, "blog", f), "utf8"));
  }
} catch {}
await writeFile(join(ROOT, "prose-corpus.json"), JSON.stringify({ ...pages, ...docs }, null, 2) + "\n");
await writeFile(join(ROOT, "doc-corpus.json"), JSON.stringify(docs, null, 2) + "\n");
console.log(`✓ prose-corpus.json (${Object.keys(pages).length + Object.keys(docs).length}) · doc-corpus.json (${Object.keys(docs).length} composed docs)`);
