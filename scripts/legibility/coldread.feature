# Cold-read spec — the judged half of the legibility gate.
#
# Runner: scripts/legibility/coldread.mjs (`npm run coldread`). It feeds the
# served index.md to claude-opus-5 in ONE POST /v1/messages with no other
# context, constrains the answer to a schema, and grades that answer against the
# Then clauses below in plain JavaScript — string containment on required
# concepts, not exact match. The model produces data; deterministic code
# produces the verdict, which is why the grading half is testable with no key.
#
# NOT temperature 0. There is no such thing here: sampling parameters were
# removed on current models and sending one returns HTTP 400, so the run is not
# deterministic and cannot be made so. Read every result as ONE SAMPLE of one
# reader, never as a fact about the page. Two runs that disagree are a finding
# about the page, not noise to suppress.
#
# NOT `claude -p`. Run anywhere in this checkout it picks up CLAUDE.md and
# .claude/inject-org-context.sh, and answers from the injected org context
# instead of from the page — green while measuring nothing. The judge must carry
# only what is in the request body. The last scenario is the canary: an answer
# written in vocabulary the page never uses did not come from a cold read.
#
# The judge is Opus DELIBERATELY, so this is a CEILING test rather than a
# typical-reader test, and the two directions are not symmetric:
#   - RED is strong evidence. If the strongest available reader cannot restate
#     the bet from 562 words, no distracted human will.
#   - GREEN is weak evidence. It rules out one failure mode — the page being
#     undecodable — and leaves every other one standing. It says nothing about
#     a stranger skimming on a phone.
# A green cold read is therefore never grounds for saying the page lands.
#
# Local tool, run by hand: not in the pipeline, not in a workflow, no CI
# credential. Whether an API credential belongs in the deploy path is open and
# is the maintainer's call. It never gates. This spec does NOT replace the real
# KPI. One outside human restating the bet outranks any number of green judge
# runs. The judge exists to catch regressions between human tests, nothing more.

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
