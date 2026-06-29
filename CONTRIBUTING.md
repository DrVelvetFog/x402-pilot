# Contributing to x402-pilot

Thanks for your interest. x402-pilot is a Claude Code plugin that helps developers **build, learn, and verify** x402 payment-protocol code. It is a developer-assistant, **not** a runtime — it never moves money or pays for tools.

## Ground rules

- **Never hand-edit the bundled corpus.** The `.x402-specs/`, `.x402-docs/`, and `.x402-sdk-docs/` directories are copied verbatim from the upstream [x402 project](https://github.com/x402-foundation/x402) (© Coinbase, Apache-2.0). Refresh them with [`sync-specs.sh`](sync-specs.sh) against a local x402 checkout — don't patch them by hand, or the next sync will silently revert your change.
- **Never hardcode chain ids, token/asset addresses, or decimals** in commands, skills, or the MCP. Read them from the `PaymentRequired` / scheme definition. Amounts are atomic-integer strings with an explicit `decimals`, never human decimals.
- **Cite the spec.** New guidance in a command or agent prompt should point at the corpus file it relies on.

## Development

- Skills are validated in CI against the Agent Skills spec — run `python3 scripts/validate_skills.py` before opening a PR.
- The conformance MCP has a smoke test: `node mcp/x402-conformance-mcp/test/smoke.mjs`.
- Bump the version with `scripts/bump_version.py` and add a `CHANGELOG.md` entry under `[Unreleased]`.

## Pull requests

1. Keep changes focused — one concern per PR.
2. Disclose AI assistance in the PR description (this repo is built with Claude Code; we just ask you to say so).
3. Make sure CI (`skills.yml`) is green.

## Reporting issues

Open a GitHub issue with a minimal repro. For anything security-sensitive, follow [SECURITY.md](SECURITY.md) instead of filing a public issue.
