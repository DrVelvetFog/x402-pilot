---
name: x402-facilitator
description: Build or verify an x402 facilitator (the verify + settle service) for a chain, with the hard-won cross-rail lessons baked in
---

Invoke the `x402-facilitator` skill to build or audit a facilitator — the service a
resource server calls to **verify** a payment payload and **settle** it on-chain.

## What this command does
- Reads the chain's `exact`-scheme spec from the corpus (`scheme_exact_<chain>.md`)
- Scaffolds or reviews the `/verify` and `/settle` endpoints and the facilitator client contract
- Bakes in the cross-rail lessons: assert value/recipient from the **net balance change**
  (not the signed intent), make double-settle **idempotent**, keep a **spent-check** where
  dry-run can't detect an already-spent payment, and bind the **executed** settlement id
- Flags custody/visibility/replay concerns before they become real-money bugs

## When to use
- You're standing up a facilitator for a chain that doesn't have one
- You're auditing an existing facilitator for correctness

## When NOT to use
- You just want to charge for an endpoint against an existing facilitator → `/x402-gate`

## Related commands
- `/x402-gate` — the resource-server side that calls this facilitator
- `/x402-verify` — run the verify→settle→idempotency flow against it
- `/x402-scheme` — if the chain has no `exact` spec yet, write that first
