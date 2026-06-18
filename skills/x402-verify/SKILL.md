---
name: x402-verify
description: "Runs the x402 conformance flow against a live or local facilitator — verify happy-path, settle, idempotent re-settle, tampered-payload reject, wrong-recipient reject, underpay reject, and spent-coin re-verify — and confirms PAYMENT-RESPONSE matches what actually settled on-chain (net balance change), not just what the facilitator reported. Use whenever the user wants to verify/test/prove a facilitator works, gate a facilitator repo in CI, or confirm someone else's facilitator before relying on it. Reads the chain's exact-scheme spec for the correct shapes, then drives the sequence via Bash (curl + the chain RPC) and reports a pass/fail line per check — the shape the #2648 recompute used. Does NOT build the facilitator (use /x402-facilitator)."
---

# x402-verify — exercise a facilitator end-to-end

> **Doc-First Requirement.** Read `${CLAUDE_PLUGIN_ROOT}/.x402-specs/schemes/exact/scheme_exact_<chain>.md`
> and `transports-v2/http.md` so the requests you send and the responses you assert match
> the spec exactly. Don't infer header or field names from memory.
>
> **Use the conformance MCP.** Drive the sequence with `mcp__x402-conformance__run_conformance`
> (facilitatorUrl [+ resourceUrl] runs the key-free checks; pass a pre-signed `paymentPayload`
> + `paymentRequirements`, and `allowSettle: true`, to run the keyed verify/settle/idempotency
> steps). Confirm the settled result against the ledger with
> `mcp__x402-conformance__inspect_payment_response` (rpcUrl for sui:*, or a supplied
> balanceChanges for any chain). Fall back to raw `Bash` (curl + RPC) only if the MCP isn't loaded.

## The conformance sequence (run all; collect, don't short-circuit)
1. **verify happy-path** — a valid payload for the advertised `PaymentRequired` verifies.
2. **settle** — settling returns success with an **executed** settlement id.
3. **idempotent re-settle** — settling the *same* payment again returns the **same** id with
   **no error** (a client retry must not read as failure).
4. **tampered-payload reject** — a payload with any field mutated is rejected.
5. **wrong-recipient reject** — a payload paying a different `payTo` is rejected.
6. **underpay reject** — an amount below the advertised price is rejected.
7. **spent-coin re-verify** — re-verifying an already-settled payment is detected (not
   silently re-accepted).

## On-chain truth check (the part that matters)
For the settled digest, query the chain RPC for the **net balance change to `payTo`** and
confirm it equals the advertised atomic amount of the advertised asset. The `PAYMENT-RESPONSE`
must agree with what the ledger shows moved — not merely with the facilitator's own report.
This is what makes the result "recomputed, not trust-the-operator."

## Output
A pass/fail line per check (7 checks + the on-chain truth check), then a summary verdict.
In CI posture, any fail is a non-zero exit. Mirror the explicit, per-check shape used in the
#2648 recompute so results are independently legible.

## Inputs to gather first
Facilitator URL (live or local), chain + RPC endpoint, the asset + `payTo` + price, and a
funded test payer. For a non-custodial facilitator you settle a real (testnet) payment —
default to **testnet** unless the user explicitly wants mainnet.

## Hand-offs
- A failing check → `/x402-facilitator` to fix, then re-run.
- Static counterpart → `/x402-review`.
