#!/usr/bin/env node
// Cold-read judge — the judged half of the legibility gate (coldread.feature).
//
//   npm run coldread                      judge dist/index.md (needs ANTHROPIC_API_KEY)
//   node coldread.mjs <page.md>           judge some other projection
//   node coldread.mjs --response r.json   grade a SAVED response — no key, no network
//   node coldread.mjs --json              machine-readable verdicts on stdout
//
// LOCAL TOOL. It is deliberately not in scripts/pipeline.mjs, not in a workflow,
// and needs no secret in CI. Whether an API credential belongs in the deploy path
// is the maintainer's call and is still open (site#225); this tool leaves it open.
//
// NOT A GATE. It reports. The exit code is 0 whenever a verdict was produced —
// green or red — precisely so that wiring it into a pipeline would not silently
// block a deploy. Exit 2 means the run did not happen (no key, HTTP error,
// unusable response), which is an operational fact, not a verdict about the page.
//
// WHY THE MESSAGES API AND NOT `claude -p`. `claude -p` is an agent harness, and
// run anywhere in this checkout it picks up CLAUDE.md and
// .claude/inject-org-context.sh — the SessionStart hook that injects the whole
// org context. A judge holding that answers "can you restate the bet from this
// page alone?" from the injected context instead of from the page, and goes green
// while measuring nothing. The one property the spec requires — a reader who has
// never seen bounded.tools — is the one property `claude -p` here cannot have.
// A POST carries only what is in the request body. That is the whole reason.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createConnection } from "node:net";
import { grade, SCENARIOS } from "./coldread-grade.mjs";

const MODEL = "claude-opus-5";
const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

// --- the answer shape --------------------------------------------------------
// One entry per scenario. These fields ask for CONTENT, never for a verdict:
// there is no `mentions_an_agent: boolean` here, because a judge that grades its
// own answer is not an instrument. coldread-grade.mjs decides pass/fail.
export const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["restate_the_bet", "why", "what", "how_far_along", "who_and_next"],
  properties: {
    restate_the_bet: {
      type: "object", additionalProperties: false, required: ["one_sentence"],
      properties: { one_sentence: { type: "string", description: "One sentence: what is this project?" } },
    },
    why: {
      type: "object", additionalProperties: false, required: ["problem"],
      properties: { problem: { type: "string", description: "What problem does this solve?" } },
    },
    what: {
      type: "object", additionalProperties: false, required: ["named", "what_one_does"],
      properties: {
        named: { type: "array", items: { type: "string" }, description: "The things named on the page that you could actually download." },
        what_one_does: { type: "string", description: "Pick one of those and say what it does, in your own words." },
      },
    },
    how_far_along: {
      type: "object", additionalProperties: false,
      required: ["working", "open_bets", "contracts_between_components"],
      properties: {
        working: { type: "array", items: { type: "string" }, description: "Parts the page presents as working today." },
        open_bets: { type: "array", items: { type: "string" }, description: "Parts the page presents as unfinished, or as a bet." },
        contracts_between_components: {
          type: "string", enum: ["solved", "open", "not_addressed"],
          description: "How the page treats keeping contracts honest BETWEEN components: solved, still open, or not addressed at all.",
        },
      },
    },
    who_and_next: {
      type: "object", additionalProperties: false, required: ["who", "what_they_want"],
      properties: {
        who: { type: "string", description: "Who made this?" },
        what_they_want: { type: "string", description: "What do they want from you, the reader?" },
      },
    },
  },
};

// --- the questions come from the spec, not from here -------------------------
// Parsed out of coldread.feature so the tool cannot drift from the file that
// defines it. If a scenario is renamed there and not here, this throws with the
// name it could not find rather than quietly judging the wrong thing.
export function parseQuestions(featureText) {
  const questions = new Map();
  let current = null;
  for (const line of featureText.split("\n")) {
    const scenario = line.match(/^\s*Scenario:\s*(.+?)\s*$/);
    if (scenario) { current = scenario[1]; continue; }
    const asked = line.match(/^\s*When asked\s+"(.+)"\s*$/);
    if (asked && current) { questions.set(current, asked[1]); current = null; }
  }
  return questions;
}

export function buildRequest(page, featureText, { model = MODEL } = {}) {
  const questions = parseQuestions(featureText);
  const asked = SCENARIOS.filter((s) => s.key !== "no_metaphor_dependency").map((s) => {
    const q = questions.get(s.name);
    if (!q) throw new Error(`coldread.feature has no 'When asked "…"' for scenario "${s.name}"`);
    return { key: s.key, name: s.name, question: q };
  });

  // The stranger. Note what is NOT said: nothing tells the judge to avoid
  // off-page vocabulary. If it were told, the metaphor/contamination check in
  // coldread-grade.mjs would be measuring the instruction instead of the read.
  const system =
    "You are reading a web page you have never seen before. You know nothing about " +
    "this project, its author, or the organization behind it beyond what is written " +
    "on the page in front of you.\n\n" +
    "You have 90 seconds. Answer at skim speed, from this page and nothing else. " +
    "If the page does not answer something, say that in the field rather than " +
    "filling it in from anything else you know.";

  const user =
    "Here is the entire page:\n\n<page>\n" + page + "\n</page>\n\n" +
    "Answer these, using only that page:\n\n" +
    asked.map((a, i) => `${i + 1}. (${a.key}) ${a.question}`).join("\n");

  // NO temperature, top_p, or top_k. They were removed on current models and
  // sending one returns HTTP 400 — see coldread.feature's header. There is no
  // determinism knob here; the report says so on every run.
  return {
    model,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
  };
}

// --- transport: the thin part -----------------------------------------------
// Two ways out, and which one ran is printed on every run because "who held the
// credential" is provenance, not a detail:
//
//   SCOUTD_SOCK set  → knock on the scout door. This process never sees a key.
//   otherwise        → direct fetch with ANTHROPIC_API_KEY from the environment.
//
// The door is the one the decision in site#229 chose. Everything below the
// envelope — the wire format, the daemon scaffolding, the proven chokepoint —
// already exists in guest-room; scoutd is the piece still to be written, and
// site#231 is the contract it has to match.

/** Direct egress: this process holds the credential. */
async function askDirect(body, { apiKey, fetchImpl = fetch }) {
  const res = await fetchImpl(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": API_VERSION,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`anthropic API ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.json();
}

/**
 * Brokered egress: scoutd holds the credential.
 *
 * guest-room's protocol.ts fixes the envelope — newline-delimited JSON,
 * `{ id, method, params? }` out, `{ id, ok, result?, error? }` back — but its
 * client half targets Bun's socket API, and this repo is Node. So this is a
 * small node:net client speaking the same format rather than an import.
 *
 * THE POINT: no `x-api-key` goes over this socket. scoutd adds the credential
 * at egress and the room never holds it. A test asserts that, because it is the
 * whole reason the door exists and it would fail silently if it regressed.
 */
export function askViaScout(body, { socketPath, connect } = {}) {
  const request = {
    id: "coldread",
    method: "read",     // the door's own language: confinement.feature registers
    params: {           // a "reads" provider on the "scout" door
      url: ENDPOINT,
      method: "POST",
      headers: { "content-type": "application/json", "anthropic-version": API_VERSION },
      body,
    },
  };
  return new Promise((resolve, reject) => {
    const socket = connect(socketPath);
    let buffered = "";
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      try { socket.end(); } catch { /* already gone */ }
      fn(value);
    };
    socket.setEncoding?.("utf8");
    socket.on("connect", () => socket.write(JSON.stringify(request) + "\n"));
    socket.on("data", (chunk) => {
      buffered += chunk;
      const line = buffered.indexOf("\n");
      if (line === -1) return;           // envelope not complete yet
      let res;
      try { res = JSON.parse(buffered.slice(0, line)); }
      catch (e) { return finish(reject, new Error(`scoutd sent malformed JSON: ${e.message}`)); }
      if (res.id !== request.id)
        return finish(reject, new Error(`scoutd answered "${res.id}", not "${request.id}"`));
      if (!res.ok)
        return finish(reject, new Error(`the scout door refused: ${res.error ?? "no reason given"}`));
      const { status, body: payload } = res.result ?? {};
      if (typeof status === "number" && status >= 400)
        return finish(reject, new Error(
          `anthropic API ${status} (via scoutd): ${JSON.stringify(payload).slice(0, 300)}`));
      finish(resolve, payload);
    });
    socket.on("error", (e) => finish(reject, new Error(`scout door at ${socketPath}: ${e.message}`)));
    socket.on("close", () => finish(reject, new Error("the scout door closed without answering")));
  });
}

/** Pick a door. `socketPath` wins when present — the whole point of setting it. */
export async function ask(body, { apiKey, socketPath, fetchImpl = fetch, connectImpl } = {}) {
  if (socketPath) return askViaScout(body, { socketPath, connect: connectImpl ?? createConnection });
  return askDirect(body, { apiKey, fetchImpl });
}

// --- response → answers ------------------------------------------------------
export function parseResponse(response) {
  if (response?.type === "error") throw new Error(`API error: ${response.error?.message ?? "unknown"}`);
  if (response?.stop_reason === "refusal") throw new Error("the judge refused the request; no verdict");
  if (response?.stop_reason === "max_tokens") throw new Error("the judge hit max_tokens mid-answer; no verdict");
  const text = (response?.content ?? []).find((b) => b.type === "text")?.text;
  if (!text) throw new Error("no text block in the response");
  let answers;
  try { answers = JSON.parse(text); }
  catch { throw new Error(`response text was not JSON: ${text.slice(0, 200)}`); }
  const missing = RESPONSE_SCHEMA.required.filter((k) => !(k in answers));
  if (missing.length) throw new Error(`response is missing ${missing.join(", ")}`);
  return answers;
}

// --- the report --------------------------------------------------------------
// Reading instructions are part of the output, not of a README nobody opens.
// The asymmetry is the whole reason a green run must not be printed as a pass.
const CEILING = [
  `The judge is ${MODEL} — deliberately the strongest reader available, so this is a`,
  "CEILING test, not a typical-reader test:",
  "  · RED is strong evidence. If the best available reader cannot restate the bet",
  "    from this page, no distracted human will.",
  "  · GREEN is weak evidence. It rules out one failure mode — the page being",
  "    undecodable — and leaves every other one standing. It says nothing about a",
  "    stranger skimming on a phone.",
  "Sampling parameters are gone on current models, so there is no temperature 0 and",
  "no determinism to claim: this is ONE SAMPLE of one non-deterministic reader, not",
  "a fact about the page. Re-run it and it may differ; that difference is a finding.",
  "One outside human restating the bet outranks any number of green runs. This tool",
  "never gates a build.",
];

export function renderReport(result) {
  const out = [];
  for (const s of result.scenarios) {
    out.push(`${s.pass ? "✓" : "✗"} ${s.name}`);
    for (const c of s.clauses) {
      if (!c.pass) out.push(`    ✗ ${c.text}`, `        → ${c.detail}`);
    }
  }
  out.push("");
  out.push(
    result.red
      ? `cold read: RED — ${result.scenarios.filter((s) => !s.pass).length} of ${result.scenarios.length} scenarios failed`
      : `cold read: GREEN (weak) — ${result.scenarios.length} scenarios cleared the ceiling`,
  );
  out.push("");
  for (const line of CEILING) out.push(line);
  return out.join("\n");
}

// --- CLI ---------------------------------------------------------------------
async function main(argv) {
  const flags = argv.filter((a) => a.startsWith("--"));
  const positional = argv.filter((a) => !a.startsWith("--"));
  const flagValue = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? null : argv[i + 1];
  };
  const savedPath = flagValue("--response");
  const pagePath = positional.filter((a) => a !== savedPath)[0] ?? "dist/index.md";
  const featurePath = flagValue("--feature") ?? new URL("coldread.feature", import.meta.url).pathname;

  let page;
  try { page = readFileSync(pagePath, "utf8"); }
  catch {
    console.error(`cold read: cannot read ${pagePath}`);
    console.error("  the judge reads the SERVED projection, same as the deterministic half.");
    console.error("  build it first:  npm run build   (or: node scripts/gen-markdown.mjs --dist)");
    return 2;
  }
  const featureText = readFileSync(featurePath, "utf8");

  let response;
  if (savedPath) {
    response = JSON.parse(readFileSync(savedPath, "utf8"));
    console.log(`cold read: grading saved response ${savedPath} against ${pagePath} — no API call\n`);
  } else {
    // Either door. SCOUTD_SOCK wins, and no key is needed on that path — the
    // broker holds it. That is the decision recorded in site#229.
    const socketPath = process.env.SCOUTD_SOCK;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!socketPath && !apiKey) {
      console.error("cold read: no way out. Set one of:");
      console.error("  SCOUTD_SOCK          the scout door — scoutd holds the credential (preferred)");
      console.error("  ANTHROPIC_API_KEY    direct egress — this process holds it");
      console.error("This tool is local-only and deliberately has no CI credential.");
      console.error("To exercise the grader without either:");
      console.error("  node --test scripts/legibility/coldread.test.mjs");
      console.error("  node scripts/legibility/coldread.mjs --response scripts/legibility/fixtures/red-vague.json");
      return 2;
    }
    let body;
    try { body = buildRequest(page, featureText); }
    catch (e) { console.error(`cold read: ${e.message}`); return 2; }
    console.log(`cold read: asking ${MODEL} to read ${pagePath} cold …`);
    console.log(
      socketPath
        ? `  credential: held by scoutd at ${socketPath} — this process never sees it`
        : "  credential: ANTHROPIC_API_KEY, in this process's environment\n" +
          "              (set SCOUTD_SOCK to reach the API through the scout door instead)",
    );
    console.log("");
    try { response = await ask(body, { apiKey, socketPath }); }
    catch (e) { console.error(`cold read: ${e.message}`); return 2; }
  }

  let answers;
  try { answers = parseResponse(response); }
  catch (e) { console.error(`cold read: ${e.message}`); return 2; }

  const result = grade(answers, page);
  if (flags.includes("--json")) {
    console.log(JSON.stringify({ model: MODEL, page: pagePath, ...result, answers }, null, 2));
  } else {
    console.log(renderReport(result));
  }
  // Always 0 on a completed run. See NOT A GATE at the top of this file.
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main(process.argv.slice(2)));
}
