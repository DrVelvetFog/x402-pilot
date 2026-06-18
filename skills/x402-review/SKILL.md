---
name: x402-review
description: "Spec-compliance review of x402 code — a gate, a facilitator, an extension, or a PR — against the bundled specs and the x402-foundation contribution rules. Use whenever the user asks to review x402 code, audit an x402 integration or facilitator, pre-flight a PR to x402-foundation/x402, or check 'is this x402 code correct/safe to ship'. Catches the high-severity classes: hardcoded chain id / token address / decimals, human-decimal amounts instead of atomic-integer + decimals, binding the signed intent instead of the settled effect, missing double-settle idempotency, missing spent-check, and contribution-hygiene gaps (unsigned commits, non-conventional messages, undisclosed AI usage, unrequested features, missing changelog fragment). Reads the spec first and cites it for every finding — spec wins over memory. Does NOT generate the code (use /x402-gate, /x402-facilitator, /x402-extension)."
---

# x402-review — spec-compliance + contribution review

> **Doc-First Requirement.** Before flagging anything, read the relevant spec from
> `${CLAUDE_PLUGIN_ROOT}/.x402-specs/` (protocol, the scheme binding, the transport, the
> extension). If your recollection and the spec disagree, **the spec wins** — and cite the
> spec file in the finding. x402 evolves fast; a pattern you "know" may be stale.

## Severity ladder — check top-down

### Critical (real-money / correctness)
- **Hardcoded chain id, token/asset address, or decimals.** Must be read from
  `PaymentRequired` / the scheme definition. Grep the diff for literal addresses, chain ids,
  and decimal constants.
- **Amount representation.** Atomic-integer **string** + explicit `decimals`. Flag any
  human-decimal (`"42.00"`), float amount, or implicit-decimals assumption.
- **Intent vs. settled effect.** The settlement id must be the **executed** on-chain id from
  the result, not the signed/pre-execution intent. Flag binding to the intent.
- **Double-settle idempotency.** A repeat settle of the same payment must return the original
  id with no error. Flag a path that re-settles or errors on replay.
- **Spent-check / replay.** On rails where dry-run can't detect spends, a local spent-check
  (or atomic archival) must exist before settling.

### High (spec conformance)
- Header names + payload field names/types match the transport + scheme spec exactly.
- Verify happens before the resource is served; verify/settle ordering matches the spec.
- Extension payloads match their declared `{ info, schema }` shape.

### Contribution hygiene (for PRs to x402-foundation/x402)
- Commits **signed + verified** (unsigned blocks review) and **conventional**.
- **AI assistance disclosed.**
- **No unrequested features**; changelog fragment present for user-facing changes (docs-only
  skips it).
- New chain followed the **3-PR workflow**; new scheme led with a **spec PR**.

## Tooling
Run `mcp__x402-conformance__check_compliance` over the changed path first — it heuristically
catches the Critical class (hardcoded chain/decimals, magic-number scaling, human-decimal
amounts) with `file:line`. Treat its output as a starting point, then read the spec and apply
the High / hygiene checks by hand. For a 402 or PAYMENT-RESPONSE under review, decode it with
`mcp__x402-conformance__decode_402` / `inspect_payment_response`.

## Output
For each finding: severity · the file:line · the spec file that governs it · the fix. Lead
with Critical. If nothing Critical/High, say so plainly — don't manufacture findings.

## Hand-offs
- Run the behavior, not just the reading → `/x402-verify`.
- Fix facilitator findings → `/x402-facilitator`.
