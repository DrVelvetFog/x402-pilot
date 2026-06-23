# Changelog

All notable changes to **x402-pilot** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
