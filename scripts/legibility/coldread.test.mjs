// Tests for the cold-read judge's GRADING half. No API key, no network.
//
// The point of this file is the failing cases. A grader that has only ever been
// seen to pass is not evidence that it can fail (docs/agentic-code-hygiene.md,
// rule 3), so every clause that can go red has a fixture that takes it red, and
// two of those fixtures are green on all five other scenarios — a grader that
// failed everything would pass a "does it ever fail?" test while being useless.
//
// Everything here reads COMMITTED files — scripts/legibility/coldread.feature,
// content/pages/index.md, and the fixtures — never a retyped copy of them. A
// hand-copy that passes while the committed file fails has burned this repo.
//
//   node --test scripts/legibility/coldread.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { grade, denyList, fold, SCENARIOS } from "./coldread-grade.mjs";
import {
  buildRequest, parseQuestions, parseResponse, renderReport, ask, RESPONSE_SCHEMA,
} from "./coldread.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = dirname(dirname(here));

// content/pages/index.md is the committed projection of the homepage, and
// gen-markdown.mjs --check (inside npm run check) fails the build if it drifts
// from the dist/index.md the judge actually reads. So this is the served page.
const PAGE = readFileSync(join(repo, "content", "pages", "index.md"), "utf8");
const FEATURE = readFileSync(join(here, "coldread.feature"), "utf8");
const fixture = (name) => JSON.parse(readFileSync(join(here, "fixtures", `${name}.json`), "utf8"));
const gradeFixture = (name) => grade(parseResponse(fixture(name)), PAGE);
const failed = (result) => result.scenarios.filter((s) => !s.pass).map((s) => s.key);

// --- the grader can fail ------------------------------------------------------

test("a vague reader takes the run red on five of six scenarios", () => {
  const result = gradeFixture("red-vague");
  assert.equal(result.red, true);
  assert.deepEqual(failed(result), [
    "restate_the_bet", "why", "what", "how_far_along", "who_and_next",
  ]);
});

test("every failing clause says which concept was missing", () => {
  const result = gradeFixture("red-vague");
  const bet = result.scenarios.find((s) => s.key === "restate_the_bet");
  const details = bet.clauses.filter((c) => !c.pass).map((c) => c.detail);
  assert.equal(details.length, 3);
  assert.match(details.join(" | "), /no mention of an agent/);
  assert.match(details.join(" | "), /checkpoint \/ gate \/ single access point/);
  // and the clause that DID hold is not reported as a failure
  const jargon = bet.clauses.find((c) => c.text.includes("capability"));
  assert.equal(jargon.pass, true);
});

test("off-page vocabulary takes the run red on its own — the trap-1 canary", () => {
  const result = gradeFixture("red-contaminated");
  // Every substantive answer is correct. The run is red anyway, because the
  // reader answered in words the page never supplies.
  assert.deepEqual(failed(result), ["no_metaphor_dependency"]);
  const detail = result.scenarios.at(-1).clauses[0].detail;
  assert.match(detail, /room/);
  assert.match(detail, /guest/);
  assert.match(detail, /door/);
  assert.match(detail, /contamination/);
});

test("filing the open problem under 'working' is caught even when the enum says open", () => {
  const answers = parseResponse(fixture("red-overclaim"));
  assert.equal(answers.how_far_along.contracts_between_components, "open");
  const result = grade(answers, PAGE);
  assert.deepEqual(failed(result), ["how_far_along"]);
  const clause = result.scenarios
    .find((s) => s.key === "how_far_along").clauses
    .find((c) => !c.pass);
  assert.match(clause.detail, /filed contracts under working/);
});

test("a malformed answer reads as a failed scenario, not a crashed run", () => {
  const result = grade({ restate_the_bet: null, what: { named: null } }, PAGE);
  assert.equal(result.red, true);
  assert.equal(result.scenarios.length, SCENARIOS.length);
  // Every scenario that asks the answer to CONTAIN something fails.
  for (const s of result.scenarios) {
    if (s.key === "no_metaphor_dependency") continue;
    assert.equal(s.pass, false, `${s.key} should fail`);
    assert.ok(s.clauses.some((c) => !c.pass));
  }
  // The metaphor scenario asks the answer NOT to contain something, so an empty
  // answer clears it vacuously. That is correct and harmless: it is the only
  // negative scenario, and the five positive ones already took the run red.
  assert.equal(result.scenarios.find((s) => s.key === "no_metaphor_dependency").pass, true);
});

// --- the grader can pass ------------------------------------------------------

test("a reader who decoded the page clears all six scenarios", () => {
  const result = gradeFixture("green");
  assert.equal(result.red, false, JSON.stringify(failed(result)));
  assert.equal(result.scenarios.length, 6);
});

test("naming the absence of a sale is not read as a sale", () => {
  // This clause asks the reader to notice the page is NOT selling, so a correct
  // answer says so out loud. A plain probe for selling language would fail the
  // very answers it exists to pass — a false RED on the likeliest correct
  // phrasing, and RED is the direction this instrument claims to be strong in.
  const base = parseResponse(fixture("green"));
  const verdict = (what_they_want) => {
    const answers = structuredClone(base);
    answers.who_and_next.what_they_want = what_they_want;
    return grade(answers, PAGE).scenarios.find((s) => s.key === "who_and_next");
  };
  assert.equal(verdict("An invitation to talk, not a product for sale.").pass, true);
  assert.equal(verdict("He wants to talk; he is not trying to sell you anything.").pass, true);
  assert.equal(verdict("They want to sell you a subscription.").pass, false);
  assert.match(
    verdict("They want to sell you a subscription.").clauses.find((c) => !c.pass).detail,
    /product for sale: "want to sell"/,
  );
});

// --- the deny list is a property of the page, not a hardcoded list ------------

test("every org term is currently off-page, so the whole canary is live", () => {
  const deny = denyList(PAGE);
  assert.ok(deny.includes("hotel") && deny.includes("door") && deny.includes("room"));
  assert.equal(deny.length, 11);
});

test("a term the page adopts stops being a canary", () => {
  assert.ok(denyList("nothing here").includes("door"));
  assert.ok(!denyList("privileged actions go through one door").includes("door"));
});

test("the package names are not read as metaphor", () => {
  // `guest-room` would trip a \broom\b probe on the hyphen; folding it first is
  // the same move check.mjs makes for the same reason.
  assert.equal(fold("Read guest-room and claude-box"), "read guestroom and claudebox");
  const result = grade(parseResponse(fixture("green")), PAGE);
  assert.equal(result.scenarios.find((s) => s.key === "no_metaphor_dependency").pass, true);
});

// --- the request: trap 2, and the shape the API actually takes ---------------

test("the request carries no sampling parameters", () => {
  const body = buildRequest(PAGE, FEATURE);
  // temperature/top_p/top_k were removed on current models; sending one is a 400.
  // coldread.feature's header used to ask for temperature 0 — it cannot be had.
  for (const k of ["temperature", "top_p", "top_k"]) {
    assert.ok(!(k in body), `${k} must not be sent`);
  }
  assert.ok(!/\btemperature\b|\btop_[pk]\b/.test(JSON.stringify(body)));
});

test("the request is one structured-output call to Opus", () => {
  const body = buildRequest(PAGE, FEATURE);
  assert.equal(body.model, "claude-opus-5");
  assert.equal(body.output_config.format.type, "json_schema");
  assert.equal(body.output_config.format.schema, RESPONSE_SCHEMA);
  assert.equal(body.messages.length, 1);
  assert.equal(body.messages[0].role, "user");
  assert.ok(!("tools" in body), "the judge gets no tools — it is a reader, not an agent");
});

test("the schema asks for content, never for a verdict", () => {
  // A boolean like `mentions_an_agent` would hand the pass/fail back to the
  // model. Nothing in the schema may look like a grade.
  const json = JSON.stringify(RESPONSE_SCHEMA);
  assert.ok(!/passe?s?|verdict|correct|mentions_|satisfies/i.test(json), json);
  assert.equal(RESPONSE_SCHEMA.additionalProperties, false);
});

test("the prompt carries the page and nothing the page does not say", () => {
  const body = buildRequest(PAGE, FEATURE);
  const user = body.messages[0].content;
  assert.ok(user.includes(PAGE), "the page itself must be in the request");
  // Whatever the request adds around the page must not smuggle in vocabulary
  // the page lacks — that would hand the judge the answer and re-create trap 1
  // inside the very call that exists to avoid it.
  const scaffolding = fold(body.system + user.replace(PAGE, ""));
  for (const term of denyList(PAGE)) {
    assert.ok(!new RegExp(`\\b${term}\\b`).test(scaffolding), `prompt leaks "${term}"`);
  }
});

test("the judge is never told to avoid off-page words", () => {
  // If it were, the metaphor check would be measuring the instruction rather
  // than the read, and the canary would be worthless.
  const body = buildRequest(PAGE, FEATURE);
  assert.ok(!/vocabular|do not use the word|avoid the word/i.test(body.system));
});

// --- the questions come from the spec ----------------------------------------

test("the five questions are read out of the committed feature file", () => {
  const questions = parseQuestions(FEATURE);
  assert.equal(questions.get("Restate the bet"), "In one sentence, what is this project?");
  assert.equal(questions.get("What"), "What would I actually download?");
  const body = buildRequest(PAGE, FEATURE);
  for (const q of ["In one sentence, what is this project?", "Is this done?", "Who made this and what do they want?"]) {
    assert.ok(body.messages[0].content.includes(q), `missing: ${q}`);
  }
});

test("a scenario renamed in the feature file breaks the build of the request", () => {
  const drifted = FEATURE.replace("Scenario: Why", "Scenario: Wherefore");
  assert.throws(() => buildRequest(PAGE, drifted), /no 'When asked/);
});

// --- response handling --------------------------------------------------------

test("prose instead of JSON is an operational failure, not a verdict", () => {
  assert.throws(() => parseResponse(fixture("malformed")), /not JSON/);
});

test("a refusal, a truncation, and a missing field each refuse to produce a verdict", () => {
  assert.throws(() => parseResponse({ stop_reason: "refusal", content: [] }), /refused/);
  assert.throws(() => parseResponse({ stop_reason: "max_tokens", content: [] }), /max_tokens/);
  assert.throws(
    () => parseResponse({ content: [{ type: "text", text: '{"why":{"problem":"x"}}' }] }),
    /missing restate_the_bet/,
  );
});

test("the empty thinking block ahead of the answer is skipped", () => {
  // Opus 5 runs adaptive thinking by default with display omitted, so a real
  // response leads with an empty thinking block.
  assert.equal(fixture("green").content[0].type, "thinking");
  assert.ok(parseResponse(fixture("green")).restate_the_bet.one_sentence.length > 0);
});

// --- transport ----------------------------------------------------------------

test("the transport posts one message and surfaces HTTP errors", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => ({ ok: 1 }) };
  };
  await ask({ model: "claude-opus-5" }, { apiKey: "sk-test", fetchImpl });
  assert.equal(calls.length, 1, "exactly one API call");
  assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
  assert.equal(calls[0].init.headers["x-api-key"], "sk-test");
  assert.equal(calls[0].init.headers["anthropic-version"], "2023-06-01");

  const failing = async () => ({ ok: false, status: 400, text: async () => "temperature: unsupported" });
  await assert.rejects(
    () => ask({}, { apiKey: "sk-test", fetchImpl: failing }),
    /anthropic API 400/,
  );
});

// --- the report ---------------------------------------------------------------

test("a green run is never printed as a pass", () => {
  const report = renderReport(gradeFixture("green"));
  assert.match(report, /GREEN \(weak\)/);
  assert.match(report, /CEILING test/);
  assert.match(report, /GREEN is weak evidence/);
  assert.match(report, /ONE SAMPLE/);
  assert.match(report, /never gates a build/);
  assert.ok(!/\bPASS\b/.test(report), "must not read as a pass");
});

test("a red run says what failed and that red is the strong signal", () => {
  const report = renderReport(gradeFixture("red-vague"));
  assert.match(report, /cold read: RED — 5 of 6/);
  assert.match(report, /RED is strong evidence/);
  assert.match(report, /no mention of an agent/);
});

// --- the scout door ----------------------------------------------------------
// The site half of site#229's decision: the credential lives in the broker.
// scoutd does not exist yet, so everything here runs against an injected socket
// — the same move the direct transport's test makes with an injected fetch.

import { EventEmitter } from "node:events";
import { askViaScout } from "./coldread.mjs";

/** A stand-in for scoutd. `reply` is an envelope, a raw string, or a function
 *  of the parsed request returning either. Records everything written. */
function fakeScout(reply) {
  const written = [];
  const socket = new EventEmitter();
  socket.setEncoding = () => {};
  socket.end = () => {};
  socket.write = (chunk) => {
    written.push(chunk);
    queueMicrotask(() => {
      const res = typeof reply === "function" ? reply(JSON.parse(chunk)) : reply;
      if (res === undefined) return;                       // model a silent door
      socket.emit("data", typeof res === "string" ? res : JSON.stringify(res) + "\n");
    });
    return chunk.length;
  };
  const connect = (path) => {
    written.path = path;
    queueMicrotask(() => socket.emit("connect"));
    return socket;
  };
  return { connect, written, socket };
}

const OK = { id: "coldread", ok: true, result: { status: 200, body: { got: "it" } } };

test("no credential crosses the scout socket", async () => {
  // THE property the door exists for. scoutd adds the key at egress; this
  // process never holds one. If this regresses it would regress silently, so it
  // is asserted rather than intended.
  const { connect, written } = fakeScout(OK);
  await ask(buildRequest(PAGE, FEATURE), {
    apiKey: "sk-ant-MUST-NEVER-APPEAR",     // deliberately supplied, must be ignored
    socketPath: "/run/scoutd.sock",
    connectImpl: connect,
  });
  // The SECRET must appear nowhere on the wire at all.
  assert.ok(!written.join("").includes("sk-ant-MUST-NEVER-APPEAR"), "the key went over the socket");
  // HEADERS are checked as parsed keys, not as substrings of the wire: the page
  // itself travels in params.body and says "authorization is the other axis", so
  // a raw-string probe for /authorization/i matches the CONTENT and fails a
  // request that is perfectly clean. Same false-positive shape the metaphor
  // canary has, caught here by the test being wrong rather than the code.
  const sent = JSON.parse(written[0]).params.headers;
  for (const name of Object.keys(sent)) {
    assert.ok(!/^(x-api-key|authorization)$/i.test(name), `sent a ${name} header`);
  }
  assert.deepEqual(Object.keys(sent).sort(), ["anthropic-version", "content-type"]);
});

test("the request is one door-protocol envelope on the named socket", async () => {
  const { connect, written } = fakeScout(OK);
  const body = buildRequest(PAGE, FEATURE);
  const result = await ask(body, { socketPath: "/run/scoutd.sock", connectImpl: connect });

  assert.equal(written.path, "/run/scoutd.sock");
  assert.equal(written.length, 1, "exactly one write");
  assert.ok(written[0].endsWith("\n"), "newline-delimited, per protocol.ts");

  const req = JSON.parse(written[0]);
  assert.deepEqual(Object.keys(req).sort(), ["id", "method", "params"]);
  assert.equal(req.method, "read");
  assert.equal(req.params.url, "https://api.anthropic.com/v1/messages");
  assert.equal(req.params.method, "POST");
  assert.equal(req.params.headers["anthropic-version"], "2023-06-01");
  assert.deepEqual(req.params.body, body, "the Messages request travels intact");
  assert.deepEqual(result, { got: "it" }, "the result body is what comes back");
});

test("the scout door is chosen over fetch whenever it is named", async () => {
  const { connect } = fakeScout(OK);
  let fetched = 0;
  const fetchImpl = async () => { fetched++; return { ok: true, json: async () => ({}) }; };
  await ask(buildRequest(PAGE, FEATURE), {
    apiKey: "sk-test", socketPath: "/run/scoutd.sock", connectImpl: connect, fetchImpl,
  });
  assert.equal(fetched, 0, "a named door must not be bypassed");
});

test("a refusal from the door is surfaced, not swallowed", async () => {
  // A denial is the door working. It must read as a refusal, never as a green run.
  const { connect } = fakeScout({ id: "coldread", ok: false, error: "caveat host= denies example.com" });
  await assert.rejects(
    () => askViaScout({}, { socketPath: "/run/scoutd.sock", connect }),
    /scout door refused: caveat host=/,
  );
});

test("an upstream HTTP error survives the extra hop", async () => {
  const { connect } = fakeScout({
    id: "coldread", ok: true,
    result: { status: 400, body: { error: { message: "temperature: unsupported" } } },
  });
  await assert.rejects(
    () => askViaScout({}, { socketPath: "/run/scoutd.sock", connect }),
    /anthropic API 400 \(via scoutd\).*temperature/s,
  );
});

test("a mismatched, malformed, broken or silent door each refuse to produce a verdict", async () => {
  const mismatched = fakeScout({ id: "someone-else", ok: true, result: { status: 200, body: {} } });
  await assert.rejects(
    () => askViaScout({}, { socketPath: "/s", connect: mismatched.connect }),
    /answered "someone-else"/,
  );

  const malformed = fakeScout("not json at all\n");
  await assert.rejects(
    () => askViaScout({}, { socketPath: "/s", connect: malformed.connect }),
    /malformed JSON/,
  );

  const broken = fakeScout(undefined);
  const brokenCall = askViaScout({}, { socketPath: "/run/scoutd.sock", connect: broken.connect });
  queueMicrotask(() => broken.socket.emit("error", new Error("ENOENT")));
  await assert.rejects(() => brokenCall, /scout door at \/run\/scoutd\.sock: ENOENT/);

  const silent = fakeScout(undefined);
  const silentCall = askViaScout({}, { socketPath: "/s", connect: silent.connect });
  queueMicrotask(() => silent.socket.emit("close"));
  await assert.rejects(() => silentCall, /closed without answering/);
});

test("a reply split across chunks is reassembled", async () => {
  const { connect, socket } = fakeScout(undefined);
  const call = askViaScout({}, { socketPath: "/s", connect });
  const whole = JSON.stringify(OK) + "\n";
  queueMicrotask(() => {
    socket.emit("data", whole.slice(0, 20));
    socket.emit("data", whole.slice(20));
  });
  assert.deepEqual(await call, { got: "it" });
});
