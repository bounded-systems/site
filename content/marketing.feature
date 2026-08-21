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
    Then surfaces present the label "CI proves it on every commit."
    And surfaces present the label "Works, with a named gap."
    And surfaces present the label "The bet, not yet the result."

  @marketing
  Scenario: The docs-generation claim (enforced) is consistent
    Then surfaces present the claim "Docs generate from source and fail the build on drift."

  @marketing
  Scenario: The specs claim (enforced) is consistent
    Then surfaces present the claim "guest-room's specs execute against the engine."

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
