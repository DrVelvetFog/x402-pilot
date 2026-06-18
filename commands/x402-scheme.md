---
name: x402-scheme
description: Author a new x402 scheme spec, or a new-chain binding of an existing scheme, from the templates and contribution workflow
---

Invoke the `x402-scheme` skill to author a protocol-level spec: either a **new chain**
binding of an existing scheme (e.g. `exact` for a chain that lacks it) or a **brand-new
scheme** family.

## What this command does
- Loads `scheme_template.md`, `scheme_impl_template.md`, and `CONTRIBUTING.md` from the corpus
- Uses a worked spec (e.g. `scheme_exact_sui.md`) as the structural reference
- Drafts the spec section-by-section, keeping chain specifics out of the chain-agnostic parts
- Enforces the **contribution workflow**: new scheme = **spec PR first**; new chain =
  **3-PR sequence** (spec → one SDK implementation → the others)

## When to use
- A chain you care about has no `exact` (or other) scheme spec
- You're proposing a new payment shape to the Foundation

## When NOT to use
- You just need to implement an *existing* spec → `/x402-facilitator` or `/x402-gate`

## Related commands
- `/x402-facilitator` — implement the scheme you just specced
- `/x402-review` — pre-flight the spec/impl against the rules before opening a PR
