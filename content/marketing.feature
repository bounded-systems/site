Feature: bounded.tools marketing micro-copy
  Surface-specific micro-copy for bounded.tools. Quoted strings must exist in
  content/strings.json and appear on the page — content.mjs checks both
  directions, so these labels can't drift from their tokens. @marketing scopes
  them to surfaces that claim the tag (content/surface.json).

  @marketing
  Scenario: The hero primary CTA names its destination
    Then surfaces present the cta "Read the bet"

  @marketing
  Scenario: The guest-room proof card states its function
    Then surfaces present the title "The library that scopes what an agent can do"

  @marketing
  Scenario: The prx proof card states its function
    Then surfaces present the title "The CLI that runs agent tasks at scale"

  @marketing
  Scenario: The claude-box proof card states its function
    Then surfaces present the title "Claude Code, scoped to one room"

  @marketing
  Scenario: The hero sub-headline is consistent
    Then surfaces present the hero "Your coding agent wanders. Keep it inside the job you gave it."

  @marketing
  Scenario: The model section heading is consistent
    Then surfaces present the heading "The model, in running code"

  @marketing
  Scenario: The proof section heading is consistent
    Then surfaces present the heading "The proof is the code"

  @marketing
  Scenario: The byline is consistent
    Then surfaces present the byline "Built by Robert DeLanghe — in public, against running code."

  @marketing
  Scenario: The contact CTA is consistent
    Then surfaces present the cta "Get in touch"

  @marketing
  Scenario: The honesty section heading is consistent
    Then surfaces present the heading "Every claim here is graded against the running code."

  @marketing
  Scenario: The guest-room proof card tag is consistent
    Then surfaces present the tag "Flagship"

  @marketing
  Scenario: The prx proof card tag is consistent
    Then surfaces present the tag "At scale"

  @marketing
  Scenario: The start-here card label is consistent
    Then surfaces present the label "guest-room — the model you can run"

  @marketing
  Scenario: The provenance card heading is consistent
    Then surfaces present the heading "Provenance you can open"

  @marketing
  Scenario: The bet grade label is consistent
    Then surfaces present the label "This claim, graded:"

  @marketing
  Scenario: The colophon contact prompt is consistent
    Then surfaces present the prompt "If your team is chewing on the same problem, I'd like to talk."

  @marketing
  Scenario: The docs-generation claim (enforced) is consistent
    Then surfaces present the claim "Docs generate from source and fail CI on drift."

  @marketing
  Scenario: The behaviour-specs claim (enforced) is consistent
    Then surfaces present the claim "guest-room's behaviour specs execute against the engine."
