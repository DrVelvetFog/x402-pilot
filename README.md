# x402-pilot

**The developer-assistant for the [x402](https://github.com/x402-foundation/x402) payment protocol** — a Claude Code plugin that bundles the x402 spec surface and gives your agent the context and workflows to *build, learn, and verify* x402 code.

x402-pilot is the **build/learn/verify** companion to the official **runtime** package [`@x402/mcp`](https://www.npmjs.com/package/@x402/mcp). It does not move money or pay for tools — it helps you write x402 integrations, facilitators, schemes, and extensions, and check them against the spec.

> Why this exists: x402 is a 2025–26 protocol mid v1→v2 transition with a fast-moving extension track. Model training data on it is thin and often wrong. x402-pilot puts the **source-of-truth specs** in front of the agent and routes every task to the right one.

## What's inside

| Piece | Status |
|---|---|
| **Bundled spec corpus** — 77 files: protocol v1/v2, transports (http/mcp/a2a), `exact` scheme across 12 chains (EVM, Sui, SVM, Aptos, TON, NEAR, Stellar, Hedera, Algorand, Concordium, Cardano, Keeta), other scheme families, extension specs, authoring templates, SDK READMEs | ✅ Phase 0 |
| **Routing agent** (`agents/x402-pilot-agent.md`) — routes a topic to the right corpus; carries the contribution rules + facilitator-implementation lessons | ✅ Phase 0 |
| **`llms.txt`** — AI entry-point manifest | ✅ Phase 0 |
| **Commands / skills** — `/x402-pilot`, `/x402-gate`, `/x402-facilitator`, `/x402-scheme`, `/x402-extension`, `/x402-review`, `/x402-verify` | ✅ Phase 1 |
| **Conformance MCP** ([`mcp/x402-conformance-mcp`](mcp/x402-conformance-mcp/)) — `decode_402`, `inspect_payment_response` (with on-chain net-balance truth check), `check_compliance`, `lint_scheme_spec`, `validate_extension`, `run_conformance`. Non-custodial: holds no keys. | ✅ Phase 2 |
| **Evals** ([`evals/`](evals/)) — 7 stale-training tasks, `baseline` vs `pilot` A/B, auto-scored to HTML. Built & validated; run with budget. | ✅ Phase 3 |

See [SCOPE.md](SCOPE.md) for the full plan.

## Use it

The corpus is meant for direct search — there is no precomputed index:

```
Glob  .x402-specs/schemes/exact/scheme_exact_*.md     # find the chain specs
Grep  "PAYMENT-RESPONSE"  .x402-specs/                 # find where a concept is defined
```

Start your agent on `agents/x402-pilot-agent.md`, then search the corpus before writing code.

## Provenance & license

x402-pilot (agent, commands, skills, MCP, scripts) is original work by **UIG Studios LLC**, Apache-2.0.

The bundled `.x402-specs/`, `.x402-docs/`, and `.x402-sdk-docs/` are copied from the [x402 project](https://github.com/x402-foundation/x402) (© Coinbase, Apache-2.0) for local developer assistance — see [NOTICE](NOTICE). Refresh them with [`sync-specs.sh`](sync-specs.sh).

Built by the author of the [first x402 facilitator on Sui](https://github.com/DrVelvetFog/sui-x402-facilitator).
