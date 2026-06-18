# x402-conformance-mcp

An MCP server with **x402 conformance + compliance tools**. It is the executable layer
of [x402-pilot](../../README.md) — the part that gives an agent verbs it can *run*, not
just docs it can read.

**Non-custodial by design: this server holds no keys and signs nothing.** Every tool is
either deterministic or network-only-without-secrets. The one flow that settles real value
(`run_conformance`'s settle step) runs only when you pass a pre-signed payload **and**
`allowSettle: true` — the signing stays in your own keyed SDK.

## Tools

| Tool | What it does | Network? |
|---|---|---|
| `decode_402` | Parse/validate a `PaymentRequired` (402); flags missing economic fields, number/human-decimal amounts, missing decimals. Takes a `url`, `raw`, or `json`. | optional unpaid GET |
| `inspect_payment_response` | Decode a `PAYMENT-RESPONSE`; optionally **recompute the on-chain truth** — net balance change to `payTo` vs the advertised atomic amount (Sui RPC, or a supplied `balanceChanges` for any chain). | optional RPC |
| `check_compliance` | Heuristic static scan for hardcoded chain id / decimals / magic-number scaling / human-decimal amounts / literal asset addresses, with `file:line`. | none |
| `lint_scheme_spec` | Diff a draft scheme markdown against the bundled `scheme_template.md` + check the load-bearing concepts are specified. | none |
| `validate_extension` | Structural check of an extension's `{ info, schema }` envelope + light known-extension field checks. | none |
| `run_conformance` | Drive verify → settle → idempotency → tampered/malformed-reject against a facilitator. Key-free steps always run; keyed steps run only with a supplied `paymentPayload`. | yes |

## Build & run

```bash
npm install
npm run build        # esbuild → dist/index.js
node dist/index.js   # stdio MCP server
npm test             # node test/smoke.mjs (exercises all 6 tools, incl. the live #2648 recompute)
```

When loaded as part of the x402-pilot plugin, Claude Code launches it automatically via
the `mcpServers` entry in `../../.claude-plugin/plugin.json`.

## Design notes
- The on-chain check in `inspect_payment_response` is the same property the
  [x402#2648](https://github.com/x402-foundation/x402/issues/2648) recompute established:
  bind to what the **ledger** shows moved, not to the operator's report.
- `run_conformance` assumes the standard facilitator API (`POST /verify`, `POST /settle`).
- Tool results are returned as pretty JSON text — agents parse them directly.
