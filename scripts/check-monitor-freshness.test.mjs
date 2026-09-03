import { test } from "node:test";
import assert from "node:assert/strict";
import { assess, fmtAge, issueTitle, issueBody, MONITORS } from "./check-monitor-freshness.mjs";

const NOW = Date.parse("2026-09-03T12:00:00Z");
const hoursAgo = (h) => new Date(NOW - h * 3_600_000).toISOString();

test("a recent success is fresh", () => {
  const a = assess(hoursAgo(2), NOW, 6);
  assert.equal(a.stale, false);
  assert.ok(Math.abs(a.ageHours - 2) < 1e-6);
});

test("a success older than the threshold is stale", () => {
  const a = assess(hoursAgo(7), NOW, 6);
  assert.equal(a.stale, true);
  assert.match(a.reason, /threshold/);
});

test("the boundary is not stale — a threshold is a ceiling, not a trigger", () => {
  assert.equal(assess(hoursAgo(6), NOW, 6).stale, false);
});

test("no successful run on record is stale, not fresh", () => {
  // The failure that motivated this: absence must never read as health.
  const a = assess(null, NOW, 6);
  assert.equal(a.stale, true);
  assert.equal(a.ageHours, null);
  assert.match(a.reason, /no successful run/);
});

test("an unparseable timestamp is stale, not fresh", () => {
  assert.equal(assess("not-a-date", NOW, 6).stale, true);
});

test("the real #258 gap trips the rekor-monitor threshold", () => {
  // rekor-monitor last completed 2026-08-21; checked 2026-09-03.
  const m = MONITORS.find((x) => x.workflow === "rekor-monitor.yml");
  const a = assess("2026-08-21T11:56:20Z", NOW, m.maxAgeHours);
  assert.equal(a.stale, true);
  assert.ok(a.ageHours > 24 * 12, `expected >12d, got ${a.ageHours}h`);
});

test("a weekly monitor is not stale one day after it ran", () => {
  const m = MONITORS.find((x) => x.workflow === "link-check.yml");
  assert.equal(assess(hoursAgo(24), NOW, m.maxAgeHours).stale, false);
});

test("every monitor threshold comfortably exceeds one period", () => {
  // Guards the wolf-crying failure: a threshold at 1x the period turns a single
  // dropped GitHub slot into an issue.
  for (const m of MONITORS) {
    assert.ok(m.maxAgeHours > 1, `${m.workflow}: threshold must exceed an hour`);
    assert.ok(m.what && m.what.length > 10, `${m.workflow}: needs a plain description`);
  }
});

test("fmtAge reads plainly at each scale", () => {
  assert.equal(fmtAge(null), "never");
  assert.equal(fmtAge(0.5), "30m");
  assert.equal(fmtAge(6), "6h");
  assert.equal(fmtAge(24 * 13), "13.0d");
});

test("the issue title is stable per monitor, so one stuck monitor means one issue", () => {
  assert.equal(issueTitle("rekor-monitor.yml"), issueTitle("rekor-monitor.yml"));
  assert.notEqual(issueTitle("rekor-monitor.yml"), issueTitle("link-check.yml"));
  assert.match(issueTitle("rekor-monitor.yml"), /rekor-monitor\.yml/);
});

test("the issue body names the monitor, the age, and where to look", () => {
  const body = issueBody({
    workflow: "rekor-monitor.yml",
    what: "Sigstore identity monitoring",
    assessment: assess("2026-08-21T11:56:20Z", NOW, 6),
    maxAgeHours: 6,
    repo: "bounded-systems/site",
    runUrl: "https://example.invalid/run",
  });
  assert.match(body, /rekor-monitor\.yml/);
  assert.match(body, /13\.0d ago/);
  assert.match(body, /actions\/workflows\/rekor-monitor\.yml/);
  assert.match(body, /does not complete is not monitoring/);
});

test("a body with no run URL still renders", () => {
  const body = issueBody({
    workflow: "link-check.yml",
    what: "external-link liveness",
    assessment: assess(null, NOW, 240),
    maxAgeHours: 240,
    repo: "bounded-systems/site",
    runUrl: null,
  });
  assert.match(body, /none on record/);
  assert.doesNotMatch(body, /undefined|null/);
});

// --- run(), with the network stubbed ----------------------------------------
// The clock and fetch are injected, so these exercise the real decision path
// offline. No live API call: a monitor's own tests must not be hostage to the
// service it monitors.

import { run } from "./check-monitor-freshness.mjs";

const quiet = { log: () => {}, logErr: () => {} };

// Builds a fake GitHub. `runs` maps workflow file -> ISO of newest success (or
// null for "no successful run"); `issues` is the list an issue query returns.
function fakeGitHub({ runs = {}, issues = [], status = {} } = {}) {
  const created = [];
  const fetchImpl = async (url, opts = {}) => {
    const path = url.replace("https://api.github.com", "");
    const wf = path.match(/workflows\/([^/]+)\/runs/)?.[1];
    if (wf) {
      if (status[wf]) return { ok: false, status: status[wf], statusText: "x", text: async () => "" };
      const at = runs[wf];
      return {
        ok: true, status: 200,
        json: async () => ({ workflow_runs: at ? [{ updated_at: at, html_url: "u" }] : [] }),
      };
    }
    if (path.startsWith("/repos/") && path.includes("/issues?")) {
      return { ok: true, status: 200, json: async () => issues };
    }
    if (opts.method === "POST" && path.endsWith("/issues")) {
      const body = JSON.parse(opts.body);
      created.push(body);
      return { ok: true, status: 201, json: async () => ({ number: 900 + created.length }) };
    }
    throw new Error(`unexpected request: ${opts.method || "GET"} ${path}`);
  };
  return { fetchImpl, created };
}

const FRESH = {
  "rekor-monitor.yml": hoursAgo(1),
  "link-check.yml": hoursAgo(24),
};

test("all monitors fresh: nothing stale, nothing filed", async () => {
  const { fetchImpl, created } = fakeGitHub({ runs: FRESH });
  const r = await run({ repo: "o/r", token: "t", now: NOW, fetchImpl, ...quiet });
  assert.deepEqual(r, { staleCount: 0, brokenCount: 0, filed: 0 });
  assert.equal(created.length, 0);
});

test("a stale monitor files exactly one issue, labelled and titled for it", async () => {
  const { fetchImpl, created } = fakeGitHub({
    runs: { ...FRESH, "rekor-monitor.yml": "2026-08-21T11:56:20Z" },
  });
  const r = await run({ repo: "o/r", token: "t", now: NOW, fetchImpl, ...quiet });
  assert.equal(r.staleCount, 1);
  assert.equal(r.filed, 1);
  assert.equal(created.length, 1);
  assert.equal(created[0].title, issueTitle("rekor-monitor.yml"));
  assert.ok(created[0].labels.includes("monitor-stale"));
  assert.match(created[0].body, /13\.0d ago/);
});

test("it does not duplicate: an already-open issue means file nothing", async () => {
  const { fetchImpl, created } = fakeGitHub({
    runs: { ...FRESH, "rekor-monitor.yml": "2026-08-21T11:56:20Z" },
    issues: [{ number: 258, title: issueTitle("rekor-monitor.yml") }],
  });
  const r = await run({ repo: "o/r", token: "t", now: NOW, fetchImpl, ...quiet });
  assert.equal(r.staleCount, 1);
  assert.equal(r.filed, 0, "must not re-file over an open issue");
  assert.equal(created.length, 0);
});

test("--dry-run detects staleness and writes nothing", async () => {
  const { fetchImpl, created } = fakeGitHub({
    runs: { ...FRESH, "rekor-monitor.yml": "2026-08-21T11:56:20Z" },
  });
  const r = await run({ repo: "o/r", dryRun: true, now: NOW, fetchImpl, ...quiet });
  assert.equal(r.staleCount, 1);
  assert.equal(r.filed, 0);
  assert.equal(created.length, 0);
});

test("REGRESSION: an API failure never reports health", async () => {
  // The bug this script exists to prevent, once reproduced inside the script
  // itself: a 401 was swallowed and the run printed "all monitors fresh" and
  // exited 0. Absence of a signal must never read as the presence of health.
  for (const code of [401, 403, 500]) {
    const { fetchImpl, created } = fakeGitHub({
      runs: FRESH,
      status: { "rekor-monitor.yml": code },
    });
    const r = await run({ repo: "o/r", token: "t", now: NOW, fetchImpl, ...quiet });
    assert.equal(r.brokenCount, 1, `${code} must count as unchecked`);
    assert.equal(r.staleCount, 0, `${code} is not staleness`);
    assert.equal(created.length, 0, `${code} must not file an issue`);
  }
});

test("a 404 is a genuinely absent workflow, not an alarm", async () => {
  const { fetchImpl, created } = fakeGitHub({
    runs: FRESH,
    status: { "rekor-monitor.yml": 404 },
  });
  const r = await run({ repo: "o/r", token: "t", now: NOW, fetchImpl, ...quiet });
  assert.deepEqual(r, { staleCount: 0, brokenCount: 0, filed: 0 });
  assert.equal(created.length, 0);
});

test("a monitor with no successful run at all is stale", async () => {
  const { fetchImpl, created } = fakeGitHub({ runs: { ...FRESH, "link-check.yml": null } });
  const r = await run({ repo: "o/r", token: "t", now: NOW, fetchImpl, ...quiet });
  assert.equal(r.staleCount, 1);
  assert.match(created[0].body, /none on record/);
});

test("run() refuses to write without a token", async () => {
  const { fetchImpl } = fakeGitHub({ runs: FRESH });
  await assert.rejects(() => run({ repo: "o/r", now: NOW, fetchImpl, ...quiet }), /GITHUB_TOKEN/);
});

test("run() requires a repo", async () => {
  await assert.rejects(() => run({ token: "t", ...quiet }), /GITHUB_REPOSITORY/);
});
