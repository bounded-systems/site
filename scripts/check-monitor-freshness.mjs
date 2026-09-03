#!/usr/bin/env node
// check-monitor-freshness — the watcher for the watchers.
//
// A scheduled MONITOR is only doing its job while it COMPLETES. A monitor that
// starts hourly and never finishes looks identical, on the Actions tab, to one
// that is fine — the runs are there, the schedule is firing, and the newest row
// is minutes old. What it is not doing is finishing, and nothing says so.
//
// That is not hypothetical here. `rekor-monitor.yml` last completed on
// 2026-08-21 and was then cancelled on every subsequent run for thirteen days
// (#258). Nobody was told, because the reusable workflow's notification job
// fires on `failure` and a cancelled run is not a failed one. The Sigstore
// identity monitoring the workflow header calls "the control that actually
// caught the Shai-Hulud worm" was down for two weeks behind a green-looking
// tab.
//
// So this checks the one thing the run status cannot: HOW OLD IS THE NEWEST
// SUCCESSFUL RUN. Age of last success is the only signal that survives every
// way a monitor can stop working — cancelled, skipped, disabled, a schedule
// silently dropped by GitHub, a repo gone quiet. It is deliberately NOT a check
// on the monitor's findings; it asks whether the instrument ran, not what it
// saw.
//
// It files ONE issue per stuck monitor and then leaves it alone. A watcher that
// opens a fresh issue every day is its own kind of silence.
//
//   node scripts/check-monitor-freshness.mjs            # check + file
//   node scripts/check-monitor-freshness.mjs --dry-run  # print the table only
//
// Exits non-zero when any monitor is stale, so the run is red as well as filed.

const API = "https://api.github.com";

// The monitors this repo relies on, and how long a gap is tolerable for each.
// A threshold is a multiple of the monitor's own period, not a guess: it must
// absorb one dropped slot without crying wolf, and catch a genuine stop well
// before it becomes routine. GitHub drops scheduled runs under load, so 1x a
// period would be noise.
export const MONITORS = [
  {
    // hourly (`41 * * * *`); 6h tolerates five dropped or overrunning slots.
    workflow: "rekor-monitor.yml",
    maxAgeHours: 6,
    what: "Sigstore identity monitoring — watches the public Rekor log for certs minted for this repo's Actions identities",
  },
  {
    // weekly (`23 6 * * 1`); 10d tolerates one dropped slot plus a margin.
    workflow: "link-check.yml",
    maxAgeHours: 24 * 10,
    what: "external-link liveness",
  },
];

export const ISSUE_LABEL = "monitor-stale";

// --- pure helpers (unit-tested) ----------------------------------------------

// The whole decision, as a function of two timestamps and a threshold, so the
// hard part is testable without a network.
export function assess(newestSuccessIso, nowMs, maxAgeHours) {
  if (!newestSuccessIso) {
    return { stale: true, ageHours: null, reason: "no successful run on record" };
  }
  const t = Date.parse(newestSuccessIso);
  if (!Number.isFinite(t)) {
    return { stale: true, ageHours: null, reason: `unparseable run timestamp: ${newestSuccessIso}` };
  }
  const ageHours = (nowMs - t) / 3_600_000;
  return {
    stale: ageHours > maxAgeHours,
    ageHours,
    reason: ageHours > maxAgeHours
      ? `last success ${fmtAge(ageHours)} ago, threshold ${fmtAge(maxAgeHours)}`
      : `last success ${fmtAge(ageHours)} ago`,
  };
}

export function fmtAge(hours) {
  if (hours == null) return "never";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

// Stable per-monitor title, so a stuck monitor maps to exactly one open issue.
export function issueTitle(workflow) {
  return `[monitor-stale]: ${workflow} has not completed successfully`;
}

export function issueBody({ workflow, what, assessment, maxAgeHours, repo, runUrl }) {
  return [
    `\`${workflow}\` has not recorded a successful run.`,
    "",
    `| | |`,
    `|---|---|`,
    `| Monitor | \`${workflow}\` |`,
    `| Watches | ${what} |`,
    `| Last success | ${assessment.ageHours == null ? "none on record" : `${fmtAge(assessment.ageHours)} ago`} |`,
    `| Threshold | ${fmtAge(maxAgeHours)} |`,
    "",
    "**A monitor that does not complete is not monitoring.** Its runs may still be",
    "appearing on the Actions tab — cancelled, skipped, or timing out — which is why",
    "this check reads the age of the last SUCCESS rather than the status of the last run.",
    "",
    `Runs: https://github.com/${repo}/actions/workflows/${workflow}`,
    "",
    "This issue is filed once and then left alone; it will not be reopened or",
    "duplicated while it stays open. Close it once the monitor completes again —",
    "the next check will re-file if it stops a second time.",
    "",
    runUrl ? `Filed by [\`check-monitor-freshness\`](${runUrl}).` : "Filed by `check-monitor-freshness`.",
  ].join("\n");
}

// --- GitHub API --------------------------------------------------------------

async function gh(path, { token, method = "GET", body, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${API}${path}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "bounded-systems-site/check-monitor-freshness",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = new Error(`GitHub ${method} ${path} → ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

// Newest run that actually SUCCEEDED, or null. `status=success` filters
// server-side, so this is one page of one, not a scan.
async function newestSuccess(repo, workflow, token, fetchImpl) {
  const q = new URLSearchParams({ status: "success", per_page: "1" });
  const data = await gh(`/repos/${repo}/actions/workflows/${workflow}/runs?${q}`, { token, fetchImpl });
  const run = data.workflow_runs?.[0];
  return run ? { at: run.updated_at || run.created_at, url: run.html_url } : null;
}

async function openStaleIssue(repo, workflow, token, fetchImpl) {
  const data = await gh(
    `/repos/${repo}/issues?${new URLSearchParams({ state: "open", labels: ISSUE_LABEL, per_page: "100" })}`,
    { token, fetchImpl },
  );
  return data.find((i) => i.title === issueTitle(workflow)) ?? null;
}

// --- run ---------------------------------------------------------------------

// The clock and the network are parameters, so the whole decision path is
// exercisable offline. Returns counts rather than exiting, so a test can assert
// on them and main() owns the exit code.
export async function run({
  repo,
  token,
  dryRun = false,
  now = Date.now(),
  runUrl = null,
  fetchImpl = fetch,
  log = console.log,
  logErr = console.error,
} = {}) {
  if (!repo) throw new Error("GITHUB_REPOSITORY is required (owner/name)");
  if (!token && !dryRun) throw new Error("GITHUB_TOKEN is required unless --dry-run");

  let staleCount = 0;
  let brokenCount = 0;
  let filed = 0;

  for (const m of MONITORS) {
    let last;
    try {
      last = await newestSuccess(repo, m.workflow, token, fetchImpl);
    } catch (e) {
      if (e.status === 404) {
        // The workflow is genuinely not in this repo. Benign: skip it.
        log(`skip   ${m.workflow.padEnd(22)} not present in ${repo}`);
        continue;
      }
      // Anything else — 401, 403, a 5xx, a network fault — means THIS CHECK
      // failed, which is not the same as the monitor being healthy. Reporting
      // "all fresh" here would reproduce, inside the watcher, the exact bug it
      // exists to catch: absence of a signal read as the presence of health.
      logErr(`BROKEN ${m.workflow.padEnd(22)} could not be checked: ${e.message}`);
      brokenCount++;
      continue;
    }

    const a = assess(last?.at ?? null, now, m.maxAgeHours);
    log(`${a.stale ? "STALE " : "fresh "} ${m.workflow.padEnd(22)} ${a.reason}`);
    if (!a.stale) continue;
    staleCount++;

    if (dryRun) {
      log(`         (dry run — would ensure an issue titled "${issueTitle(m.workflow)}")`);
      continue;
    }

    const existing = await openStaleIssue(repo, m.workflow, token, fetchImpl);
    if (existing) {
      log(`         already filed: #${existing.number}`);
      continue;
    }
    const created = await gh(`/repos/${repo}/issues`, {
      token,
      fetchImpl,
      method: "POST",
      body: {
        title: issueTitle(m.workflow),
        body: issueBody({ workflow: m.workflow, what: m.what, assessment: a, maxAgeHours: m.maxAgeHours, repo, runUrl }),
        labels: [ISSUE_LABEL, "bug"],
      },
    });
    filed++;
    log(`         filed: #${created.number}`);
  }

  if (brokenCount) {
    logErr(`\n${brokenCount} monitor(s) could not be checked — this run proves nothing about them.`);
  }
  if (staleCount) {
    logErr(`${staleCount} monitor(s) stale.`);
  }
  if (!staleCount && !brokenCount) {
    log("\nAll monitors have completed within their thresholds.");
  }
  return { staleCount, brokenCount, filed };
}

// --- main --------------------------------------------------------------------

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const { staleCount, brokenCount } = await run({
    repo,
    token: process.env.GITHUB_TOKEN,
    dryRun: process.argv.includes("--dry-run"),
    runUrl: process.env.GITHUB_RUN_ID && repo
      ? `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
  });
  if (staleCount || brokenCount) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
