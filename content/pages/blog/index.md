<!-- Writing — Bounded Systems
     /blog/ — projected from the built page by scripts/gen-markdown.mjs.
     Do not edit: change the page (or its generator) and rebuild. -->

# Writing

Working notes on keeping agent-built software honest — the bet, graded against the code.

## [In agent-built software, the open problem is the seams between the pieces](bifurcation-and-inter-contract-enforcement.html)

An agent can write the filesystem layer now. The process spawner and tool adapters, the CLI — all of it. What it can't do yet, what nobody has really solved, is keep all of those h

## [Provenance is not legitimacy](provenance-is-not-legitimacy.html)

A signed build tells you who produced an artifact and that the bytes are intact. It does not tell you the build was meant to happen. That gap is small, easy to oversell, and the en

## [Trust lives outside the page](trust-lives-outside-the-page.html)

A badge a page renders is a claim the page controls. A verifier a page ships is also a claim the page controls — if the bytes can lie, the script that checks them can lie too. So t

## [Author a verb once. Get the CLI, the MCP tool, the OpenAPI route, and the model schema for free.](verbspec-author-once-project-everywhere.html)

Ship one capability to both humans and agents today and you write it four times: a CLI with flag parsing and --help, an MCP tool definition, an OpenAPI operation, and a tool-use sc

## [Why I built this: my coding agent kept doing things I didn't ask for](why-i-built-this-agent-kept-doing-things-i-didnt-ask-for.html)

I run an AI coding agent on my own work every day. It writes code, runs commands, and opens pull requests. It earns its place — and it has a habit I got tired of: left alone, it wa
