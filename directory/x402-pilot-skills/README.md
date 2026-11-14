# x402-pilot (skills edition)

Spec-grounded help for the [x402](https://github.com/x402-foundation/x402) payment protocol, inside Claude. This is the skills-only edition of [x402-pilot](https://github.com/DrVelvetFog/x402-pilot), version 0.2.0.

x402 settles real value, and a model's memory of the protocol goes stale fast. This plugin bundles the x402 specs, transport bindings, scheme definitions, extension specs and SDK docs, so Claude reads the spec before it writes or reviews x402 code, and cites the file it relied on.

## Install

In Claude Code:

```shell
/plugin marketplace add DrVelvetFog/x402-pilot
/plugin install x402-pilot-skills@uig-studios
```

## What's inside

- **Skills:** `x402-gate` (charge for an HTTP endpoint), `x402-facilitator` (build or audit a facilitator), `x402-scheme` (draft a payment scheme), `x402-extension` (draft an extension), `x402-review` (spec-compliance review of x402 code or a PR), `x402-verify` (the verify, settle, idempotency and rejection checks against a facilitator), `x402-spend-limit` (cap what an agent can spend).
- **Commands:** `/x402-pilot` plus one per skill.
- **Agent:** `x402-pilot-agent` routes a question to the right part of the spec and carries the rules that keep money code correct.
- **Reference corpus** in `reference/`: protocol v1 and v2, HTTP/MCP/A2A transports, the `exact` scheme across 12 chains, other scheme families, extension specs, authoring templates and SDK READMEs.

## What this edition leaves out

The full plugin also ships a local conformance MCP server (`decode_402`, `inspect_payment_response`, `check_compliance`, `lint_scheme_spec`, `validate_extension`, `run_conformance`) and a SessionStart hook. Neither is included here. Where a skill mentions those tools, it tells Claude to do the check by hand from the spec instead. Install the full plugin from the repository if you want the tools.

## What it runs and connects to

Nothing on its own. This edition is Markdown and JSON only: no hooks, no MCP servers, no scripts, no telemetry. Claude may suggest commands such as `curl` against a facilitator or RPC URL you provide, and runs them only through your normal tool permissions.

## Provenance and license

The material in `reference/` comes from the x402 project (Copyright 2024 Coinbase, Apache-2.0). See NOTICE for what this edition changed. The skills, commands and agent are by UIG Studios LLC, Apache-2.0.
