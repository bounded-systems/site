// Cold-read judge — the grading half. PURE: no I/O, no network, no clock, no key.
//
// WHY THE SPLIT. The judge is one model call and the model is not deterministic
// (see coldread.feature's header: sampling parameters are gone on current models,
// so "temperature 0" is not available to us). If the pass/fail logic lived in the
// prompt, nothing about this instrument would be checkable — a green run would be
// the model's opinion of its own answer. So the model produces DATA and this file
// produces the VERDICT. Everything here is a pure function of (answers, page),
// which is why it can be tested against committed fixtures with no API key, and
// why the failing case can be DEMONSTRATED rather than asserted (see
// docs/agentic-code-hygiene.md rule 3: a gate's own claim about itself is not
// evidence).
//
// The Then clauses below are transcribed from coldread.feature. The feature file
// is the spec; if you change a clause there, change it here and the test with it.

// --- normalization -----------------------------------------------------------
// The repo NAMES contain metaphor words. "guest-room" would trip a `\broom\b`
// metaphor probe on the hyphen, flagging every correct answer to "what would I
// download?". check.mjs folds the same two names for the same reason; fold them
// to single words here so the package is a package and `room` is a metaphor.
export const fold = (s) =>
  String(s ?? "")
    .replace(/\bguest[-\s]?room\b/gi, "guestroom")
    .replace(/\bclaude[-\s]?box\b/gi, "claudebox")
    .toLowerCase();

// Returns the matched TEXT, not the pattern — a failure detail should read
// `read it as a product for sale: "wants to sell"`, which a human can act on,
// rather than a regex source dumped into the report.
const hit = (text, patterns) => {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return JSON.stringify(m[0]);
  }
  return null;
};

// --- concept vocabularies ----------------------------------------------------
// String containment on required CONCEPTS, not exact match — the feature header
// says so. Each concept is a set of alternatives; any one satisfies it.
const AGENT = [/\bagents?\b/, /\bclaude code\b/, /\bcoding assistants?\b/];
const CODING = [/\bcoding\b/, /\bcode\b/, /\bai\b/, /\bllm\b/, /\bsoftware\b/, /\bdeveloper\b/];
const CHOKEPOINT = [
  /\bcheck ?points?\b/, /\bgate(?:way|keeper)?s?\b/, /\bchoke ?points?\b/,
  /\bsingle (?:point|access|place|entry)\b/, /\bone (?:gate|point|place|door)\b/,
  /\bintermediar(?:y|ies)\b/, /\bbrokers?\b/, /\bprox(?:y|ies)\b/, /\bmediat/,
];
const REFUSAL = [/\brefus/, /\bblock/, /\bden(?:y|ies|ied|ial)/, /\bprevent/, /\bstops?\b/, /\bstopped\b/, /\brejects?\b/];
const AUTHZ = [
  /\bunauthori[sz]ed\b/, /\bnot allowed\b/, /\bpermissions?\b/, /\ballowed to\b/,
  /\bauthori[sz]/, /\bprivileges?\b/, /\bscope[ds]?\b/, /\bcredentials?\b/, /\baccess\b/,
];
const ACCESS_NOUN = [/\baccess\b/, /\bpermissions?\b/, /\bcredentials?\b/, /\bprivileges?\b/, /\bauthority\b/, /\brights?\b/];
const OWNERSHIP = [
  /\byour own\b/, /\byour\b/, /\buser'?s?\b/, /\bown\b/, /\bsame\b/,
  /\binherits?\b/, /\bhuman'?s?\b/, /\boperator'?s?\b/, /\bwhoever ran\b/,
];
const PACKAGES = [/\bguestroom\b/, /\bclaudebox\b/, /\bprx\b/];
const DOES_SOMETHING = [
  /\bscope[ds]?\b/, /\bpermissions?\b/, /\bruns?\b/, /\bruntime\b/, /\bisolat/,
  /\bcredentials?\b/, /\bpipeline\b/, /\bdrives?\b/, /\bissue\b/, /\bpr\b/,
  /\bmerge[ds]?\b/, /\bspecs?\b/, /\bbundle\b/, /\bsandbox/, /\bdaemon\b/, /\bagents?\b/,
];
const PERSON = [/\bbobby\b/, /\bdelanghe\b/];
const SOLO = [/\bsolo\b/, /\bone person\b/, /\bsingle (?:person|developer|maintainer|engineer)\b/, /\bindividual\b/, /\bby himself\b/, /\bone (?:developer|maintainer)\b/];
const IN_PUBLIC = [/\bin public\b/, /\bpublicly\b/, /\bopen[- ]source\b/, /\bin the open\b/, /\bpublic log\b/, /\bgithub\b/, /\bpublished\b/];
const INVITATION = [
  /\btalk\b/, /\bconversation\b/, /\bcontact\b/, /\breach out\b/, /\bconnect\b/,
  /\bcollaborat/, /\bfeedback\b/, /\bdiscuss/, /\bhear from\b/, /\bget in touch\b/, /\bemail\b/,
];
// Deliberately NARROW, and negation-aware. This clause asks the reader to spot
// that the page is NOT selling, so the correct answer says so out loud — "not a
// product for sale", "he isn't trying to sell you anything". A plain probe for
// selling language fails exactly the answers it is supposed to pass, which is a
// false RED on the one clause most likely to be answered correctly. So: only an
// unnegated ASSERTION of selling counts.
const SELLING = [
  /\b(?:wants?|trying|looking|aims?|seeks?) to (?:sell|monetize)\b/,
  /\bfor purchase\b/, /\bbuy (?:it|now|the)\b/, /\bpricing page\b/, /\bsubscription plans?\b/,
];
const NEGATOR = /\b(?:not|isn'?t|aren'?t|no|never|rather than|instead of|without|doesn'?t|don'?t|nothing)\b/;
const assertsSelling = (text) => {
  for (const p of SELLING) {
    const m = text.match(p);
    if (!m) continue;
    // A negator anywhere in the clause leading up to the match flips it.
    if (NEGATOR.test(text.slice(Math.max(0, m.index - 40), m.index))) continue;
    return JSON.stringify(m[0]);
  }
  return null;
};
// The jargon the feature file's But clause names for scenario 1.
const JARGON = [/\bcapabilit(?:y|ies)\b/, /\bseams?\b/, /\bocap\b/];

// The org's own vocabulary. NONE of it is on the page — which is the point.
// coldread.feature asks that no correct answer require decoding a metaphor, and
// this list is also the contamination canary for trap 1: `claude -p` run in this
// checkout is fed the org context (Hotel / floor / suite / room / door / guest)
// by CLAUDE.md and .claude/inject-org-context.sh. A judge that answers in
// vocabulary the page never supplies was not reading the page.
const ORG_VOCABULARY = [
  "hotel", "bellhop", "concierge", "front desk", "keycard", "check-in",
  "floor", "suite", "door", "room", "guest",
];

// Terms the PAGE itself uses are not metaphor dependency — they are the page.
// Computing the deny list against the page keeps this honest if the page changes:
// start saying "door" on the homepage and "door" stops being a canary.
export const denyList = (page) => {
  const folded = fold(page);
  return ORG_VOCABULARY.filter((t) => !new RegExp(`\\b${t}\\b`).test(folded));
};

const foundTerms = (text, terms) =>
  terms.filter((t) => new RegExp(`\\b${t}\\b`).test(text));

// --- the scenarios, transcribed from coldread.feature ------------------------
// Each clause returns {pass, detail}; detail is what gets printed on a failure,
// so it names the concept that was missing rather than just saying "no".
const need = (text, patterns, label) => {
  const m = hit(text, patterns);
  return { pass: Boolean(m), detail: m ? `matched ${m}` : `no mention of ${label}` };
};

export const SCENARIOS = [
  {
    key: "restate_the_bet",
    name: "Restate the bet",
    question: 'In one sentence, what is this project?',
    clauses: [
      {
        text: "the answer mentions an AI coding agent",
        run: (a) => {
          const t = fold(a.restate_the_bet?.one_sentence);
          const agent = need(t, AGENT, "an agent");
          if (!agent.pass) return agent;
          return need(t, CODING, "coding/AI (an agent, but of what kind)");
        },
      },
      {
        text: "the answer mentions a checkpoint, gate, or single access point",
        run: (a) => need(fold(a.restate_the_bet?.one_sentence), CHOKEPOINT, "a checkpoint / gate / single access point"),
      },
      {
        text: "the answer mentions refusing or blocking unauthorized actions",
        run: (a) => {
          const t = fold(a.restate_the_bet?.one_sentence);
          const refusal = need(t, REFUSAL, "refusing or blocking");
          if (!refusal.pass) return refusal;
          return need(t, AUTHZ, "what is being refused (authorization)");
        },
      },
      {
        // "does not REQUIRE the words" — we can only grade the answer we got, so
        // the checkable reading is: this answer did not reach for them. Same
        // reading check.mjs takes with its deny lexicon.
        text: 'the answer does not require the words "capability", "seam", or "ocap"',
        run: (a) => {
          const m = hit(fold(a.restate_the_bet?.one_sentence), JARGON);
          return { pass: !m, detail: m ? `leaned on jargon: ${m}` : "no jargon needed" };
        },
      },
    ],
  },
  {
    key: "why",
    name: "Why",
    question: "What problem does this solve?",
    clauses: [
      {
        text: "the answer says agents act with the user's own access or permissions",
        run: (a) => {
          const t = fold(a.why?.problem);
          const agent = need(t, AGENT, "an agent");
          if (!agent.pass) return agent;
          const access = need(t, ACCESS_NOUN, "access / permissions / credentials");
          if (!access.pass) return access;
          return need(t, OWNERSHIP, "whose access it is (the user's own)");
        },
      },
    ],
  },
  {
    key: "what",
    name: "What",
    question: "What would I actually download?",
    clauses: [
      {
        text: "the answer names guest-room, claude-box, or prx",
        run: (a) => {
          const named = (a.what?.named ?? []).map(fold);
          const found = named.filter((n) => PACKAGES.some((p) => p.test(n)));
          return found.length
            ? { pass: true, detail: `named ${found.join(", ")}` }
            : { pass: false, detail: `named nothing on the page: ${JSON.stringify(a.what?.named ?? [])}` };
        },
      },
      {
        text: "the answer can say what at least one of them does",
        run: (a) => {
          const t = fold(a.what?.what_one_does);
          const names = need(t, PACKAGES, "which package it is describing");
          if (!names.pass) return names;
          const does = need(t, DOES_SOMETHING, "what it actually does");
          if (!does.pass) return does;
          const words = t.split(/\s+/).filter(Boolean).length;
          return words >= 6
            ? { pass: true, detail: `${words} words, names a package and what it does` }
            : { pass: false, detail: `only ${words} words — names it without saying what it does` };
        },
      },
    ],
  },
  {
    key: "how_far_along",
    name: "How far along",
    question: "Is this done?",
    clauses: [
      {
        text: "the answer distinguishes working parts from open bets",
        run: (a) => {
          const working = a.how_far_along?.working ?? [];
          const open = a.how_far_along?.open_bets ?? [];
          if (!working.length) return { pass: false, detail: "listed nothing as working" };
          if (!open.length) return { pass: false, detail: "listed no open bets — reads the page as finished" };
          return { pass: true, detail: `${working.length} working / ${open.length} open` };
        },
      },
      {
        text: "the answer does not claim inter-component contract enforcement is solved",
        run: (a) => {
          if (a.how_far_along?.contracts_between_components === "solved")
            return { pass: false, detail: 'read contracts between components as "solved"' };
          // Cross-check the classification against the lists: filing contracts
          // under "working" claims it is solved whatever the enum says.
          const leaked = (a.how_far_along?.working ?? []).filter((w) => /contract/i.test(w));
          if (leaked.length)
            return { pass: false, detail: `filed contracts under working: ${leaked.join("; ")}` };
          return { pass: true, detail: `contracts read as "${a.how_far_along?.contracts_between_components}"` };
        },
      },
    ],
  },
  {
    key: "who_and_next",
    name: "Who and what next",
    question: "Who made this and what do they want?",
    clauses: [
      {
        text: "the answer identifies one person building in public",
        run: (a) => {
          const t = fold(a.who_and_next?.who);
          const who = hit(t, PERSON) ?? hit(t, SOLO);
          if (!who) return { pass: false, detail: "no one person identified" };
          return need(t, IN_PUBLIC, "building in public");
        },
      },
      {
        text: "the answer identifies the invitation to talk, not a product for sale",
        run: (a) => {
          const t = fold(a.who_and_next?.what_they_want);
          const sells = assertsSelling(t);
          if (sells) return { pass: false, detail: `read it as a product for sale: ${sells}` };
          return need(t, INVITATION, "an invitation to talk");
        },
      },
    ],
  },
  {
    key: "no_metaphor_dependency",
    name: "No metaphor dependency",
    question: "(applies to every answer above)",
    clauses: [
      {
        text: "no correct answer requires decoding a metaphor to state",
        run: (a, page) => {
          const deny = denyList(page);
          const offenders = [];
          for (const [key, value] of Object.entries(a)) {
            const terms = foundTerms(fold(JSON.stringify(value)), deny);
            if (terms.length) offenders.push(`${key}: ${terms.join(", ")}`);
          }
          return offenders.length
            ? {
                pass: false,
                detail:
                  `answered in vocabulary the page never uses — ${offenders.join(" · ")}. ` +
                  "That is either metaphor dependency or context contamination (see coldread.feature, trap 1).",
              }
            : { pass: true, detail: `none of ${deny.length} off-page terms used` };
        },
      },
    ],
  },
];

// --- the grader --------------------------------------------------------------
/**
 * Grade one judge response. Pure.
 * @param {object} answers - the structured answers (see RESPONSE_SCHEMA in coldread.mjs)
 * @param {string} page - the markdown the judge was shown, for the deny list
 * @returns {{red: boolean, scenarios: Array}}
 */
export function grade(answers, page) {
  const scenarios = SCENARIOS.map((s) => {
    const clauses = s.clauses.map((c) => {
      let r;
      // A malformed answer must read as a FAILED scenario, never as a crashed
      // run — a judge that returns nonsense is a finding about the page's
      // legibility budget too.
      try { r = c.run(answers, page); }
      catch (e) { r = { pass: false, detail: `ungradeable answer: ${e.message}` }; }
      return { text: c.text, ...r };
    });
    return { key: s.key, name: s.name, pass: clauses.every((c) => c.pass), clauses };
  });
  return { red: scenarios.some((s) => !s.pass), scenarios };
}
