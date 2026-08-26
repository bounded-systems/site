Feature: bounded.tools marketing micro-copy
  Surface-specific micro-copy for bounded.tools. Quoted strings must exist in
  content/strings.json and appear on the page — content.mjs checks both
  directions, so these labels can't drift from their tokens. @marketing scopes
  them to surfaces that claim the tag (content/surface.json).

  Rewritten with the homepage cut (site issue 219). The scenarios that named the
  old page's furniture — the bet CTA, the model and proof section headings, the
  card tags, the start-here label — are gone because the copy they pinned is
  gone. Deleting a scenario alongside the thing it described is the honest move;
  leaving it to fail, or loosening it to pass, would both be worse.

  Same move again with the claims registry (site issue 233 §3). The two
  graded-claim scenarios — "The docs-generation claim (enforced)" and "The specs
  claim (enforced)" — are gone because the copy they pinned is gone: the Status
  buckets now say what each GRADE means and link to the registry for which claims
  hold it, instead of carrying example sentences that restated specific claims.

  Those example sentences had drifted from the graph they summarised, and the
  drift is measured rather than argued. With the registry publishing c1's
  canonical text on /conformance, check-repetition scored the homepage paraphrase
  against it at 83% shared vocabulary:

    "Docs generate from source and fail CI on drift."         (c1, canonical)
    "Docs generate from source and fail the build on drift."  (the paraphrase)

  c5 and c6 scored 50% and 36% the same way. That is one dataset with two
  sources and visibly different words — the failure this repo argues against, and
  the finding issue 233 §3 raised. Re-pointing these scenarios at the canonical
  sentences would have entrenched the second source by copying claim text into
  content/strings.json; deleting the paraphrases removed it. The claim text is
  now held to the graph by a stronger mechanism than a Gherkin scenario:
  scripts/claims-registry.mjs --check asserts on every `npm run check` that each
  claim's current sentence and gap appear in the committed projection.

  @marketing
  Scenario: The hero headline is consistent
    Then surfaces present the hero "Your coding agent runs with your access. Bounded Systems puts a checkpoint in front of it."

  @marketing
  Scenario: The what's-here section heading is consistent
    Then surfaces present the heading "What's here"

  @marketing
  Scenario: The guest-room card states its function
    Then surfaces present the title "The runtime that scopes an agent"

  @marketing
  Scenario: The claude-box card states its function
    Then surfaces present the title "Claude Code running inside that scope"

  @marketing
  Scenario: The prx card states its function
    Then surfaces present the title "The pipeline"

  @marketing
  Scenario: The try-it label is consistent
    Then surfaces present the label "Try it"

  @marketing
  Scenario: The status section heading is consistent
    Then surfaces present the heading "Status, graded"

  @marketing
  Scenario: The grade names are consistent
    Then surfaces present the label "Enforced"
    And surfaces present the label "Partial"
    And surfaces present the label "Aspirational"

  @marketing
  Scenario: Each grade says what it means
    Then surfaces present the label "A check proves it, and the build fails without it."
    And surfaces present the label "Works, with a named gap."
    And surfaces present the label "The bet, not yet the result."

  @marketing
  Scenario: The deeper-section lead-ins are consistent
    Then surfaces present the label "Verify this site yourself."
    And surfaces present the label "The package map."
    And surfaces present the label "Writing."

  @marketing
  Scenario: The byline is consistent
    Then surfaces present the byline "I'm Bobby DeLanghe — Brooklyn, NY. I build agent infrastructure and capability-security systems."

  @marketing
  Scenario: The colophon contact prompt is consistent
    Then surfaces present the prompt "If your team is chewing on the same problem, I'd like to talk:"

  @marketing
  Scenario: The contact CTA names its destination
    Then surfaces present the cta "hello@bounded.tools"
