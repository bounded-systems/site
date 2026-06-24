# Why I built this: my coding agent kept doing things I didn't ask for

I run an AI coding agent on my own work every day. It writes code, runs
commands, and opens pull requests. It earns its place — and it has a habit I got
tired of: left alone, it wanders. It edits a file I didn't mean to touch, runs a
command I wouldn't have run, or quietly does three extra things on the way to the
one I actually asked for.

Bounded Systems is what I built to stop that. This post is the plain version of
what these tools are and how I got here — usage first, because that's the part
you can't see from the repos.

## What I actually run

Two things, used together.

**prx** drives the work. I hand it an issue ticket and it chains the pull
requests from there, writing structured output at each step — so the path from
"here's the task" to "here's the PR" is a sequence of artifacts I can check, not
one opaque jump. When something comes out wrong, I can see which step it came
from.

**guest-room** is the part I built most recently, and the one I reach for now. It
scopes what the agent can reach: the job gets exactly the capabilities it needs
and nothing else. That's what keeps the agent from wandering — it can't get into
what it was never handed.

The short version, the one that actually lands when I say it out loud:
*guest-room is what I did so the agent didn't get distracted or do things I
didn't want.* That sentence is the whole project, and until now it was nowhere on
the page.

## How I got here

None of this showed up as a plan. It's all derivations of one need, renamed each
time I understood it a little better.

Six months ago the project was **dev-contracts** — I wanted to give an agent a
contract it couldn't drift away from. It became **prx** when what actually
mattered turned out to be driving whole units of work, not holding a single
contract. And
prx grew **guest-room** when I needed the agent's *authority* to be the thing
under contract: one sanctioned way to reach each kind of power, instead of
trusting the agent to stay in its lane.

Same problem, three names. Each one is the last one seen more clearly.

## Why I keep building it

I build these because they help me build these. prx and guest-room are the tools
I use to work on prx and guest-room — every project is meant to make the next one
safer and faster to do with an agent. That loop is the point. If a tool here
doesn't earn its keep in my own daily work, it doesn't belong in the project.

It's also the honest answer to "is this a real thing or an idea?" It's real
because I depend on it. A solo project, worked out in the open and graded against
the running code — but the first user it has to convince is me.

If you're chewing on the same thing — an agent that's useful but won't stay in
bounds — I'd like to talk.
