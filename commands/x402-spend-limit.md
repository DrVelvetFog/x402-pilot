---
name: x402-spend-limit
description: Put a spending limit on an x402 payer (an AI agent's wallet), and make a facilitator or seller honour one before settling
---

Invoke the `x402-spend-limit` skill to work on **spending limits for x402 payers**: a
daily budget the payer's owner sets, that a facilitator checks before it settles, so an
over-budget payment is refused with no funds moved.

## What this command does
- **Facilitator / seller side:** adds a pre-check before `verify` and again before
  `settle`: find the payer's budget mirror through an on-chain registry, ask it
  `canSpend(payer, amount)`, refuse if the answer is no, and fail closed if the check
  itself fails
- **Payer / operator side:** walks you through giving an agent a cross-chain allowance
  on testnet with Pocket Money (the reference implementation), which you run yourself
- States plainly what a limit does **not** cover

## When to use
- You run an agent that pays over x402 and don't want to hand it a funded wallet
- You run a facilitator or paid API and want to refuse payers that are over their limit

## When NOT to use
- You want a cap inside the paying client only → that is the SDK's own spend controls;
  the skill points you there and explains why it isn't enough against a stolen key
- You want to build the facilitator itself → `/x402-facilitator` first, then come back

## Status
The registry and `canSpend` interface are a **draft proposal**, not part of the x402
specification. The skill says so in everything it generates.

## Related commands
- `/x402-facilitator` — the verify/settle service this check sits in front of
- `/x402-extension` — if you want to turn the draft into a spec proposal
- `/x402-verify` — prove a refusal end-to-end
