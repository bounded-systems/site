#!/usr/bin/env node
// Reduce the org's public Front Desk feed to what a page needs.
//
//   node scripts/trim-front-desk.mjs < front-desk-public.json > data/front-desk.json
//
// The published feed is the WHOLE board — 2,471 public rows, ~1.3 MB, mostly
// Done. A page wants the claimable head of it, so the trim happens here rather
// than in the renderer or by hand: one place decides what "claimable" means, and
// a refresh lane can pipe the feed straight through it.
//
// WHAT SURVIVES, and why each exclusion is a rule rather than a filter someone
// tuned until the list looked nice:
//   - Status == "Todo"      — Done and In Progress are not work to pick up.
//   - not claimed           — the feed's own flag (label or assignee). Someone
//                             else is on it; the board says so.
//   - type == "Issue"       — a PR is a change awaiting a check, not claimable
//                             work. front-desk.sh holds the same line and prints
//                             the count it withheld; so does this.
//   - has a numeric Score   — the board's own ranking. An unscored row cannot be
//                             placed against the others, and inventing a
//                             position for it would be inventing a ranking.
//
// The board's Score is carried through UNCHANGED. This file must never compute a
// rank of its own: the point of the projection is that the site shows the org's
// ranking, and a second opinion computed here would be a different board wearing
// the same name.
const LIMIT = Number(process.env.DESK_LIMIT || 25);

// Read stdin as a stream: `readFile(process.stdin.fd)` rejects on a pipe.
const raw = await new Promise((resolve, reject) => {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => { buf += c; });
  process.stdin.on("end", () => resolve(buf));
  process.stdin.on("error", reject);
});
const feed = JSON.parse(raw);

if (feed.feed !== "front-desk-public") {
  console.error(`✗ refusing to trim: expected the 'front-desk-public' feed, got '${feed.feed ?? "(unnamed)"}'.`);
  console.error("  The private projection carries private titles; only the filtered feed may reach the site.");
  process.exit(1);
}
if (!feed.generated_at) {
  console.error("✗ refusing to trim: the feed carries no generated_at, so the page could not state its age.");
  process.exit(1);
}

const items = Array.isArray(feed.items) ? feed.items : [];
const status = (i) => (i.fields || {}).Status || null;
const score = (i) => { const s = (i.fields || {}).Score; return typeof s === "number" ? s : null; };

const todo = items.filter((i) => status(i) === "Todo");
const unclaimed = todo.filter((i) => !i.claimed);
const issues = unclaimed.filter((i) => i.type === "Issue");
const ranked = issues.filter((i) => score(i) !== null).sort((a, b) => score(b) - score(a));

const out = {
  $source: "trimmed from the org's front-desk-public feed by scripts/trim-front-desk.mjs — do not hand-edit",
  generated_at: feed.generated_at,
  // The feed's per-status counts are deliberately NOT carried. Nothing renders
  // them — `withheld` below already holds every number the page states — and
  // their keys are the board's raw status names, one of which is "Todo", which
  // the copy lint reads as a leftover placeholder marker and fails the build on.
  // Carrying unused data that breaks a gate is pure cost.
  // Every number the page needs to be honest about what it is NOT showing.
  withheld: {
    todo_total: todo.length,
    claimed: todo.length - unclaimed.length,
    pull_requests: unclaimed.length - issues.length,
    unscored: issues.length - ranked.length,
    beyond_limit: Math.max(0, ranked.length - LIMIT),
  },
  limit: LIMIT,
  items: ranked.slice(0, LIMIT).map((i) => ({
    repo: i.repo,
    number: i.number,
    title: i.title,
    url: i.url,
    score: score(i),
    labels: i.labels || [],
  })),
};

process.stdout.write(JSON.stringify(out, null, 2) + "\n");
console.error(
  `✓ trim: ${out.items.length} claimable of ${todo.length} Todo ` +
  `(${out.withheld.claimed} claimed, ${out.withheld.pull_requests} PRs, ` +
  `${out.withheld.unscored} unscored, ${out.withheld.beyond_limit} beyond limit)`,
);
