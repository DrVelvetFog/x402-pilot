---
name: x402-verify
description: Run the x402 conformance flow (verify → settle → idempotency → tampered/underpay rejection) against a live or local facilitator
---

Invoke the `x402-verify` skill to prove a facilitator actually behaves — not by reading
the code, but by exercising the full flow against a real endpoint.

## What this command does
- Reads the chain's `exact`-scheme spec to know the correct request/response shapes
- Drives the conformance sequence against a facilitator URL (live or local):
  **verify happy-path → settle → idempotent re-settle → tampered-payload reject →
  wrong-recipient reject → underpay reject → spent-coin re-verify**
- Confirms `PAYMENT-RESPONSE` matches what actually settled on-chain (net balance change),
  not just what the facilitator reported
- Reports a pass/fail line per check (the shape the #2648 recompute used)

> Phase 1 runs this via `Bash` (curl + the chain's RPC). Phase 2's conformance MCP will
> wrap it as a single `run_conformance` tool.

## When to use
- Before announcing a facilitator, or before relying on someone else's
- As a CI gate on a facilitator repo

## When NOT to use
- You haven't built the facilitator yet → `/x402-facilitator`

## Related commands
- `/x402-facilitator` — build/fix the thing you're verifying
- `/x402-review` — static review to complement the dynamic check
