---
name: x402-scheme
description: "Authors a protocol-level x402 spec — either a new-chain binding of an existing scheme (e.g. exact for a chain that lacks one) or a brand-new scheme family. Use whenever the user wants to add a chain to x402, write a scheme spec, propose a new payment shape to the Foundation, or formalize how settlement works on a rail. Loads scheme_template.md, scheme_impl_template.md, and CONTRIBUTING.md from the corpus, uses a worked spec (scheme_exact_sui.md) as the structural reference, keeps chain specifics out of the chain-agnostic sections, and enforces the contribution workflow (new scheme = spec PR first; new chain = 3-PR sequence spec→one SDK→others). Does NOT implement an existing scheme (use /x402-facilitator) — this produces the spec."
license: Apache-2.0
metadata:
  author: UIG Studios
  version: "0.1.0"
---

# x402-scheme — author a scheme / new-chain spec

> **Doc-First Requirement.** Load from `${CLAUDE_PLUGIN_ROOT}/.x402-specs/`:
> `scheme_template.md`, `scheme_impl_template.md`, `transport_template.md`, and
> `CONTRIBUTING.md`; plus a worked reference — `schemes/exact/scheme_exact.md` (chain-agnostic)
> and a real chain binding like `scheme_exact_sui.md`. Mirror the template's section order
> and headings exactly; reviewers diff against the template.

## Decide what you're writing
- **New-chain binding** of an existing scheme (most common): the chain-agnostic scheme
  already exists; you're adding `scheme_<scheme>_<chain>.md`. Reference an existing binding
  closely.
- **New scheme family**: a new payment shape (like `upto`, `auth-capture`,
  `batch-settlement`). Higher bar; the chain-agnostic spec comes first, chains after.

## Phase 0 — Ground in the template + a sibling
1. Read `scheme_template.md` (and `scheme_impl_template.md` for the implementation notes).
2. Open the closest existing sibling spec and map its sections — you'll mirror them.
3. List what's genuinely chain-specific (signature scheme, address format, how value is
   asserted, replay protection) vs. what belongs in the chain-agnostic layer.

## Phase 1 — Draft section by section
- Keep the **chain-agnostic invariants** (the join between `PaymentRequired` and
  `PaymentPayload`, the verify/settle contract) out of the chain-specific file.
- For the chain section, specify precisely: payload fields + types, how the facilitator
  **asserts value/recipient** (prefer net-balance-change over tx parsing), how **replay**
  is prevented, the **settlement identifier** (the executed id), and **amount encoding**
  (atomic-integer string + explicit `decimals` — name the chain's decimals).
- Never hardcode a token address into the spec narrative; describe how it's carried.

## Phase 2 — Contribution workflow (do not skip)
- **New scheme → spec PR first**, before any SDK code.
- **New chain → 3-PR sequence**: (1) the spec, (2) one reference SDK implementation,
  (3) the remaining SDKs. Don't bundle them.
- Commits **signed + conventional**; disclose AI assistance; add a changelog fragment for
  user-facing changes; no unrequested features.
- Drop the Foundation's agent-prompt into the working repo's `CLAUDE.md` at PR time.

## Phase 3 — Hand off
- Lint the draft with `mcp__x402-conformance__lint_scheme_spec` (checks it against the
  template's required sections + the load-bearing concepts) before opening the PR.
- Implement the spec you just wrote → `/x402-facilitator`.
- Pre-flight the draft → `/x402-review`.
