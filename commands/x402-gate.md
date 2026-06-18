---
name: x402-gate
description: Scaffold a payment-gated HTTP endpoint with x402 (express, hono, next, flask, or fastapi)
---

Invoke the `x402-gate` skill to add an x402 paywall to an HTTP endpoint — the
resource-server side of the protocol (return a 402 `PaymentRequired`, accept and
verify the payment header, settle via a facilitator, return `PAYMENT-RESPONSE`).

## What this command does
- Detects (or asks) your framework: express, hono, next, flask, fastapi
- Reads the current `exact`-scheme + transport spec from the corpus before generating
- Wires the chosen facilitator (hosted URL or your own), the asset, and the price —
  **read from config, never hardcoded**
- Produces a minimal, spec-compliant paywall plus a one-line client test

## When to use
- You have an API endpoint and want to charge per call in stablecoin
- You're prototyping an agent-payable tool behind HTTP

## When NOT to use
- You want to *build the facilitator itself* → `/x402-facilitator`
- You want to add paid tools to an MCP server → that's the runtime `@x402/mcp` (the
  skill will point you there)

## Related commands
- `/x402-facilitator` — the verify/settle side
- `/x402-review` — check the result for spec-compliance
- `/x402-verify` — prove the gate end-to-end
