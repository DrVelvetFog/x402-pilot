---
name: x402-extension
description: "Authors or integrates an x402 extension — the typed {info, schema} payloads attached to PaymentRequired.extensions / PaymentPayload.extensions. Use whenever the user wants signed offers/receipts, discovery metadata (bazaar), gas-sponsoring (eip2612/erc20), sign-in-with-x, idempotency / payment-identifier keys, auth-hints, or http-message-signatures — to consume an existing extension or propose a new one. Reads the extension spec from .x402-specs/extensions/ and the @x402/extensions SDK surface, and for receipt/accountability work keeps settlement and receipt as two objects joined by one content-addressed hash, amount as atomic-integer + explicit decimals, and the binding rail-agnostic. Does NOT change the scheme itself (use /x402-scheme when the need is protocol-level)."
license: Apache-2.0
metadata:
  author: UIG Studios
  version: "0.1.0"
---

# x402-extension — author or integrate an extension

> **Doc-First Requirement.** Read the specific extension under
> `${CLAUDE_PLUGIN_ROOT}/.x402-specs/extensions/` (e.g. `extension-offer-and-receipt.md`,
> `eip2612_gas_sponsoring.md`, `erc20_gas_sponsoring.md`, `sign-in-with-x.md`,
> `builder_code.md`, `payment_identifier.md`, `extension-auth-hints.md`,
> `http-message-signatures.md`) and `.x402-sdk-docs/ts-extensions.md`. Extensions are
> versioned and typed — match the declared `{ info, schema }` shape exactly.

## What an extension is
An optional, typed payload attached to the protocol's `extensions` field — discovery
metadata, wallet re-auth, signed offers/receipts, idempotency keys, or facilitator-assisted
gas — without changing the core scheme. Most ship as npm subpath imports
(`@x402/extensions/<name>`).

## Phase 0 — Consume or author?
- **Consume an existing extension:** read its spec, then wire the `{ info, schema }` payload
  into your `PaymentRequired`/`PaymentPayload` per the SDK. Validate the payload against the
  declared schema; don't fabricate fields.
- **Author a new extension:** you're proposing protocol surface — spec-first, same bar as a
  scheme. Confirm the behavior genuinely doesn't belong in the scheme itself.

## Phase 1 — Receipt / accountability extensions (the offer-and-receipt lane)
If the work is binding a settlement to a signed execution receipt, hold these invariants
(they're what makes the binding sound and rail-agnostic):
- **Two objects, one join key.** Settlement answers "did the money move, and was it
  authorized." The receipt answers "who did what, against what state, did it complete."
  Keep them separate; join by **one content-addressed hash**, not by amount equality.
- **Amount is NOT in the join key.** Bind by content address so the same receipt composes
  over an EVM token and a non-EVM facilitator alike. Folding amount into the key breaks
  rail-agnosticism (a 9-decimal atomic and a 6-decimal human amount can't share a key).
- **Canonicalize normatively.** RFC 8785 (JCS) fixes byte order; you still must fix the
  field schema and types. Amount = atomic-integer string + explicit integer `decimals`.
- **Lifecycle is explicit.** Carry `seq` + `terminal` so a non-terminal receipt can't be
  passed off as the settled one.

## Phase 2 — Validate + hand off
- Check the payload with `mcp__x402-conformance__validate_extension` (structural envelope +
  known-extension field checks); validate the remaining fields against the spec by hand.
- Protocol-level need instead of an add-on → `/x402-scheme`.
- Pre-PR → `/x402-review` (signed/conventional commits, AI disclosure, changelog fragment).
