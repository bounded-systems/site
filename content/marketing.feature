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
