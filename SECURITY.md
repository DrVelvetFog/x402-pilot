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
