# Changelog

All notable changes to **x402-pilot** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Conformance MCP 0.1.1: every tool now declares MCP tool annotations (`title`, `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`). Five tools are read-only; `decode_402` and `inspect_payment_response` may call a URL or RPC you pass in. `run_conformance` is marked not read-only, destructive and non-idempotent because with `allowSettle: true` it settles real testnet value.

### Added
- The conformance MCP server is packaged for npm as `@uigstudios/x402-conformance-mcp` (the plain `x402-conformance-mcp` name belongs to another project). The package bundles a copy of the spec corpus, so `lint_scheme_spec` and `validate_extension` work outside the plugin. `server.json` for the official MCP Registry sits next to it.
- `.cursor-plugin/plugin.json` (Cursor), `gemini-extension.json` (Gemini CLI) and `glama.json` (Glama MCP directory), plus a README table of install options for other agents.

### Fixed
- `scripts/bump_version.py` now updates and checks every version entry in a file. Before, it only touched the first, so the `x402-pilot-skills` entry in `marketplace.json` stayed at 0.2.0 in the 0.3.0 release.
- The conformance server's build output starts with `#!/usr/bin/env node`, so it runs as an installed command.

## [0.3.0] - 2026-11-14

### Changed
- Bundled corpus re-synced from upstream x402-foundation/x402 @ `1a08434` (was the 2026-06-18 snapshot): 86 files, up from 77. The `exact` scheme now covers 17 chains, adding Canton, Casper, LN-BTC, Starknet and XRPL. Also new: `upto` for SVM and XRPL, `batch-settlement` for SVM, a wallet-compatibility guide, and upstream's SVM transaction v1, multi-payee splits, facilitator error messages and batch-settlement voucher mode. The MCP-server guide moved upstream from `.md` to `.mdx`.
- README, `llms.txt`, `/x402-pilot` and the hero image updated for 17 chains and 86 files. The hero image's command count is corrected from 7 to 8.

### Added
- `.claude-plugin/icon.png` — square listing icon for the Claude plugin directory.
- `directory/x402-pilot-skills/` — skills-only "directory edition" (skills, commands, agent, spec corpus; no MCP server, hook or scripts), built by `scripts/build_directory_edition.py` and listed in the marketplace as `x402-pilot-skills`. Anthropic's plugin directory accepts only Markdown, JSON, YAML and images from unverified publishers.
- README section "What it runs and connects to": the SessionStart hook's file reads and the conformance MCP's network calls, stated up front.
- `.skillspector-baseline.yaml` — every SkillSpector finding on this repo, reviewed against the source and recorded with a reason. See "Scanning this plugin" in `SECURITY.md`.

### Changed
- `evals/run-comparison.sh` — the scoring turn now runs with read-only tools (Read, Glob, Grep) instead of `--dangerously-skip-permissions`. Task runs are unchanged.

## [0.2.0] - 2026-11-12

### Added
- `/x402-spend-limit` command and skill — spending limits for x402 payers: the facilitator-side pre-check (registry → mirror → `canSpend`, checked before verify and before settle, fail closed) and a guided testnet setup of a cross-chain agent allowance with Pocket Money. Marked throughout as a draft proposal, not part of the x402 specification.
- `examples/live-evm-verify-target.md` — a known-good live Base (EVM) x402 v2 seller to point `/x402-verify` and `/x402-review` at, with a free no-wallet preview and all payment params read from the decoded `PaymentRequired` challenge (no hardcoded chain/asset/amount).

## [0.1.1] - 2026-09-21

### Added
- Spec-conformant `SKILL.md` frontmatter on all six skills — `license: Apache-2.0`
  and `metadata` (author, version) — per the
  [Agent Skills spec](https://agentskills.io/specification).
- `repository` and `license` fields in `.claude-plugin/plugin.json`.
- `scripts/validate_skills.py` — stdlib-only conformance validator (name regex /
  length / directory match, description length, frontmatter presence), wired into
  CI via `.github/workflows/skills.yml`.
- `scripts/bump_version.py` — bumps the version across `plugin.json`,
  `marketplace.json`, and every skill's `metadata.version`, with `--check` drift
  detection.
- x402-aware `SessionStart` hook (`hooks/`) that front-loads the routing agent and
  the doc-first iron rules when working in an x402 project, and stays silent in
  unrelated sessions.

### Security
- Conformance MCP: updated `fast-uri` to 3.1.8 (host-confusion and SSRF
  advisories) and rebuilt the bundled `dist/index.js`, the only one of the
  flagged packages that ships in the bundle. `hono`, `@hono/node-server`, `qs`
  and `ip-address` were also updated in the lockfile; they belong to the MCP
  SDK's HTTP transport, which this stdio server never loads.

### Notes
- Multi-harness packaging (Codex / Cursor / Gemini manifests) is deferred until
  each can be install-tested on its own harness.

## [0.1.0] - 2026-06-18

Initial public release.

### Added
- Bundled x402 spec corpus: `.x402-specs/` (protocol, transports, schemes,
  extensions, templates), `.x402-docs/`, and `.x402-sdk-docs/` — the offline
  source of truth the plugin reads before generating code.
- Routing agent (`agents/x402-pilot-agent.md`) carrying the iron rules and the
  hard-won facilitator lessons.
- Six skills (each with a matching `/command`): `x402-gate`, `x402-facilitator`,
  `x402-verify`, `x402-scheme`, `x402-extension`, `x402-review`.
- `x402-conformance` MCP server — non-custodial conformance checks that recompute
  a settlement against the on-chain balance change.
- Evals harness (`evals/`) with fixtures and a baseline.
