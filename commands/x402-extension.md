---
name: x402-extension
description: Author or integrate an x402 extension (offers/receipts, gas-sponsoring, sign-in, idempotency, builder code, payment identifier)
---

Invoke the `x402-extension` skill to work with x402 **extensions** — the typed
`{ info, schema }` payloads attached to `PaymentRequired.extensions` /
`PaymentPayload.extensions`.

## What this command does
- Reads the relevant extension spec from `.x402-specs/extensions/` (offer-and-receipt,
  eip2612/erc20 gas-sponsoring, sign-in-with-x, builder_code, payment_identifier,
  auth-hints, http-message-signatures) and the `@x402/extensions` SDK surface
- Helps you **consume** an existing extension, or **author** a new one against the spec shape
- For receipt/accountability work: keeps settlement and receipt as **two objects joined by
  one content-addressed hash**, amount as atomic-integer + explicit `decimals`, and the
  binding **rail-agnostic** (no reaching into settlement internals)

## When to use
- You need discovery metadata, signed offers/receipts, wallet re-auth, idempotency keys,
  or facilitator-assisted gas
- You're proposing a new extension to the Foundation

## When NOT to use
- The behavior belongs in the scheme itself, not an add-on → `/x402-scheme`

## Related commands
- `/x402-review` — validate the extension payload shape before shipping
- `/x402-scheme` — when the need is protocol-level, not an extension
