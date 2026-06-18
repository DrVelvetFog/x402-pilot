---
name: x402-facilitator
description: "Builds or audits an x402 facilitator — the service that verifies a PaymentPayload and settles it on-chain for a given scheme/chain. Use whenever the user wants to stand up a facilitator, add a chain to facilitator support, implement /verify and /settle, run their own settlement service instead of a hosted one, or audit an existing facilitator for correctness. Reads the chain's exact-scheme spec from the corpus and bakes in the hard-won cross-rail lessons: assert value/recipient from the net balance change (not the signed intent), make double-settle idempotent, keep a spent-check where dry-run can't detect spent payments, bind the executed settlement id, and state custody/visibility/replay assumptions. Authored by the builder of the first x402 facilitator on Sui. Does NOT add a paywall to an endpoint (use /x402-gate) and does NOT write a missing scheme spec (use /x402-scheme first)."
---

# x402-facilitator — build or audit a verify+settle service

> **Doc-First Requirement.** Read `${CLAUDE_PLUGIN_ROOT}/.x402-specs/schemes/exact/scheme_exact_<chain>.md`
> and the chain-agnostic `scheme_exact.md` before writing or judging facilitator code, plus
> `x402-specification-v2.md` for the verify/settle contract and `.x402-sdk-docs/ts-core.md`
> for the facilitator-client interface. Cite the spec for every shape you assert.

## What a facilitator is
The trusted (but ideally **non-custodial**) service a resource server calls to:
- **verify** — is this `PaymentPayload` valid for the advertised `PaymentRequired`?
- **settle** — execute it on-chain and report the result.

## Phase 0 — Scope
1. **Chain + scheme.** Which chain, which scheme (`exact` unless told otherwise). If the
   chain has no scheme spec, stop and route to `/x402-scheme` — spec PR comes first.
2. **Custody posture.** Non-custodial is the default and the safer story. State explicitly
   who holds keys and what the facilitator can/can't do.
3. **Build vs audit.** Generating a new service, or reviewing an existing one.

## Phase 1 — The five cross-rail lessons (enforce these)
These are where facilitators get subtly wrong on non-EVM rails. Apply them as you build,
or check them as you audit:

1. **Assert from the net balance change, not the transaction structure.** On many rails
   "the transaction" and "what actually moved to `payTo`" differ (gas, change outputs).
   Verify value/recipient from the **net balance change to `payTo`**, and bind *that*
   verified result — not a re-derivation from the raw tx.
2. **Bind the executed effect, not the signed intent.** The settlement id is the resulting
   on-chain transaction/update id, returned in `PAYMENT-RESPONSE`. Never return the
   pre-execution intent/command id as the settlement reference.
3. **Make double-settle idempotent.** A retried 402 re-hits the facilitator. A second
   settle of the same payment must return the **original** settlement id with **no error**,
   so a client retry doesn't read as a failure. Look up the prior result; don't re-settle.
4. **Keep a spent-check where dry-run can't see spends.** Some rails' dry-run/simulation
   cannot detect an already-spent payment. Add a local spent-check before settling, or rely
   on the rail's atomic archival if it provides one.
5. **State required visibility on privacy rails.** "The facilitator verified it" only holds
   within the facilitator's visibility scope; document who must be a stakeholder/observer.

## Phase 2 — Implement (or review) the endpoints
- `/verify` — validate the payload against the scheme; never hardcode chain/token/decimals;
  reject tampered payloads, wrong recipient, and underpayment with clear errors.
- `/settle` — execute, then assert the net-balance result, then return the executed id +
  verified result. Idempotent on replay.
- **Concurrency.** Guard the verify→settle window (TOCTOU). Prove idempotency under
  concurrent retries, not just sequential ones.
- Optional: gas sponsorship (e.g. an `eip2612`/`erc20` gas-sponsoring extension, or a
  chain gas-station) — read the extension spec before wiring it.

## Phase 3 — Prove it
- Route to `/x402-verify` to run verify→settle→idempotency→tampered/underpay→spent-coin
  against the running service.
- Route to `/x402-review` for the static compliance pass before any PR.

## Contribution note
If this facilitator adds a chain to the official repos, it's a **3-PR workflow** (spec →
one SDK → others) with **signed, conventional commits** and AI-usage disclosure.
