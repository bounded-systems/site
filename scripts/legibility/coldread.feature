# Cold-read spec — the judged half of the legibility gate.
#
# Runner: feed the served index.md to a model with no other context,
# temperature 0, using the prompt in each scenario. Grade the answer
# against the Then clauses (string containment on required concepts,
# not exact match). Run on deploy, not per-commit; a judge is a proxy
# instrument, and flaky proxies don't belong in the inner loop.
#
# This spec does NOT replace the real KPI. One outside human restating
# the bet outranks any number of green judge runs. The judge exists to
# catch regressions between human tests, nothing more.

Feature: A stranger can decrypt the landing page at skim speed

  Background:
    Given a reader who has never seen bounded.tools
    And they are given only the served index.md
    And they are told they have 90 seconds

  Scenario: Restate the bet
    When asked "In one sentence, what is this project?"
    Then the answer mentions an AI coding agent
    And the answer mentions a checkpoint, gate, or single access point
    And the answer mentions refusing or blocking unauthorized actions
    But the answer does not require the words "capability", "seam", or "ocap"

  Scenario: Why
    When asked "What problem does this solve?"
    Then the answer says agents act with the user's own access or permissions

  Scenario: What
    When asked "What would I actually download?"
    Then the answer names guest-room, claude-box, or prx
    And the answer can say what at least one of them does

  Scenario: How far along
    When asked "Is this done?"
    Then the answer distinguishes working parts from open bets
    And the answer does not claim inter-component contract enforcement is solved

  Scenario: Who and what next
    When asked "Who made this and what do they want?"
    Then the answer identifies one person building in public
    And the answer identifies the invitation to talk, not a product for sale

  Scenario: No metaphor dependency
    When asked any question above
    Then no correct answer requires decoding a metaphor to state
