// The legibility gate's verdict, as claim text — ONE source for two renderers.
//
// scripts/legibility/check.mjs emits this node into the served claims graph
// (dist/claims.jsonld, via gen-claims.mjs), and scripts/gen-claims-rows.mjs
// renders the same words into the homepage claims registry. Both import THIS
// file, so the sentence a reader sees on the page and the sentence in the
// signed graph cannot drift apart.
//
// The GRADE is not here on purpose: check.mjs computes it from the run
// (enforced on a pass, aspirational on a fail). The registry renders the claim
// as enforced because the deterministic gate is a build step that fails the
// build — a page that ships is a page the gate passed. The gap below is the
// honest limit of that: what the gate proves is non-regression, not
// comprehension.
export const LEGIBILITY_CLAIM = {
  id: "https://bounded.tools/claims#legibility",
  claim: "The landing page passes the legibility gate.",
  gap:
    "The gate measures budgets and banned words, so it can show the page did not regress. " +
    "It cannot show the page lands: the cold-read scenarios are judged by a model on demand (npm run coldread), by hand and never in the build. " +
    "That judge is Opus — a ceiling test, so a red run is strong evidence and a green one is weak. " +
    "The comprehension test itself is one outside human and is not automated.",
  // Evidence when no CI run is in scope: the gate itself. check.mjs swaps in
  // the concrete run URL when it emits the graph from CI.
  evidence: "https://github.com/bounded-systems/site/blob/main/scripts/legibility/check.mjs",
};
