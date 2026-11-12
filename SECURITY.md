# Security Policy

## Scope

x402-pilot is a **non-custodial developer-assistant**. It holds no keys, signs no transactions, and moves no money. The conformance MCP performs read-only checks (decoding payloads, recomputing settlements against public on-chain data, linting). There is no server and no stored secret in this project.

That said, x402 settles real value, so we take correctness and supply-chain issues seriously.

## Reporting a vulnerability

**Please do not open a public issue for security reports.**

Email **tjagodka@gmail.com** with:

- a description of the issue and its impact,
- steps to reproduce (or a proof of concept),
- the affected version / commit.

You can expect an acknowledgement within 72 hours and a status update as we investigate. Coordinated disclosure is appreciated — we'll agree on a disclosure timeline with you before any public write-up.

## What counts

- Guidance that would lead a user to generate **non-compliant or unsafe x402 code** (e.g. hardcoded decimals, a custodial pattern presented as non-custodial).
- A conformance check that **passes code it should fail** (false-negative on a real spec violation).
- Supply-chain concerns in the bundled corpus or dependencies.

## What doesn't

- Issues in the upstream [x402 protocol](https://github.com/x402-foundation/x402) itself — report those upstream.
- The `@x402/mcp` runtime package — that's a separate project.

## Scanning this plugin

If you run [SkillSpector](https://github.com/NVIDIA/SkillSpector) on this repo you'll get a "do not install" verdict out of the box. Almost all of it comes from the bundled x402 spec corpus: example JSON, sample `fetch` calls and OAuth prose in protocol docs trip rules written for skill instructions. The lockfile gets flagged as "unpinned" too.

We read every finding against the source (SkillSpector 2.12.0, static stage, 2026-11-12) and recorded each one with a reason in `.skillspector-baseline.yaml`:

```bash
skillspector scan . --no-llm --baseline .skillspector-baseline.yaml --show-suppressed
```

With the baseline the scan reports no active findings. It still says "caution", because the scanner can't fully parse some files, including the minified `mcp/x402-conformance-mcp/dist/index.js`. You can build that bundle yourself from `src/` with `npm run build`.

Don't take the baseline on trust. It's a list of claims you can check. Scan a clean checkout; a working folder with `node_modules/` in it produces thousands of unrelated findings.
