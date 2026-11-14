---
name: x402-review
description: Spec-compliance review of x402 code — catches hardcoded chain/token/decimals, intent-vs-settlement bugs, missing idempotency, and contribution-rule violations
---

Invoke the `x402-review` skill to review x402 code (a gate, a facilitator, an extension,
or a PR) against the spec and the contribution rules before you ship or open a PR.

## What this command does
- Reads the relevant spec from the corpus, then reviews the code against it — **spec wins
  over memory**, and every finding cites the spec file
- Flags the high-severity classes: **hardcoded chain id / token address / decimals**,
  human-decimal amounts instead of atomic-integer + `decimals`, binding the **signed intent**
  instead of the **settled effect**, missing **double-settle idempotency**, missing spent-check
- Checks contribution hygiene: signed commits, conventional commits, AI-usage disclosure,
  no unrequested features, changelog fragment for user-facing changes

## When to use
- Pre-PR review of any x402 contribution
- Auditing an integration or facilitator you inherited

## When NOT to use
- You want to *generate* the code → `/x402-gate`, `/x402-facilitator`, `/x402-extension`

## Related commands
- `/x402-verify` — run the behavior, don't just read it
- `/x402-facilitator` — fix facilitator findings
