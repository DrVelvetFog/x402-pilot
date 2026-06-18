# Eval baseline — x402-pilot

This file preserves scored runs, because `evals/results/` is gitignored. Append a new
section each time you run the suite with a meaningful change.

## Status: not yet run

The suite (runner, 7 tasks, fixtures, scorer) ships ready to run. It has **not** been
executed against the model yet — running it spends a Claude session per task per arm
(7 tasks × 2 arms + 1 scoring turn ≈ 15 `claude -p` invocations).

Run it with:

```bash
bash evals/run-comparison.sh
```

Then paste the headline + per-task table from `evals/results/<TS>/score.html` into a new
section below, with the date and the plugin commit SHA.

## What this suite is testing

Each task is a **stale-training trap** — a place where a model's pre-x402 training tends to
produce plausible-but-wrong code, and where x402-pilot's bundled spec corpus supplies the
correct fact. The hypothesis under test: **the `pilot` arm clears traps the `baseline` arm
walks into.**

| Task | The trap a bare model walks into | The corpus fact x402-pilot supplies |
|---|---|---|
| `task-01-usdc-atomic-amount` | writes `"0.01"` or a float | amount = atomic-integer string (`"10000"` at 6 decimals) |
| `task-02-sui-decimals` | assumes 6 decimals (USDC habit) → `1000` | native SUI is **9** decimals → `1000000` |
| `task-03-v2-headers` | reaches for the blogged v1 `X-PAYMENT` / keeps `Authorization` | x402 **v2** uses `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE` |
| `task-04-bind-settled-not-intent` | returns the signed intent id | bind the **executed** settlement digest |
| `task-05-net-balance-assert` | parses `tx.outputs` | assert from the **net balance change** to payTo |
| `task-06-no-hardcode-asset` | leaves the hardcoded asset/chain | read `asset`/`network` from the offer |
| `task-07-receipt-binding` (rubric) | binds by amount / reaches into settlement internals | content-address join, amount out of the key, seq/terminal, JCS canonicalization |

A null or weak result (baseline already passes most) is itself worth recording honestly — it
would tell you the corpus isn't adding much on these tasks, and the suite should get harder.

<!-- Append scored runs below this line -->

## Run 1 — 2026-06-18 (v0.1 suite, commit f3a28a1) — HONEST NULL

| Pass rate | baseline | pilot |
|---|---|---|
| 7 tasks | **7/7 (100%)** | **7/7 (100%)** |
| Total output tokens | 7,677 | 9,855 (+28%) |

**Result: no delta.** Both arms passed every task. The auto-scorer's own note says it
plainly — *"corpus lookup visible in cost but not in binary outcome"*: the pilot arm spent
28% more tokens consulting the corpus and reached the same answers.

**Why (honest):**
1. The frontier model already knows the common x402 facts. Bare baseline wrote
   `amount: "1000000" // 0.001 SUI (1e9 MIST)` (knows SUI=9 decimals) and `"PAYMENT-SIGNATURE"`
   /`PAYMENT-RESPONSE` (knows v2 headers, didn't regress to v1 `X-PAYMENT`) with no corpus.
2. Several v0.1 prompts leaked the answer ("USDC has 6 decimals", "use `tx.balanceChanges`").

**Takeaway:** do **not** pitch x402-pilot as "fixes the model's stale x402 knowledge" — this
run disproves that for a strong model. The v0.2 suite (below) de-leaks the prompts and adds
**tool-advantaged** tasks (on-chain settlement audit; multi-issue compliance scan) where the
conformance MCP can *verify* something a bare model can only guess at — testing the plugin's
actual value surface, not model recall.

## Run 2 — 2026-06-18 (v0.2 suite: de-leaked + 2 tool-advantaged tasks)

| Pass rate | baseline | pilot |
|---|---|---|
| 9 tasks | **9/9** | **9/9** |

**Result: still no binary delta** — including on the two tasks designed to need the tool:
- `task-08-settlement-audit` (planted on-chain mismatch, claimed 1000000 vs net-to-payTo
  990000, with a +10000 decoy to a third address): **both** arms correctly returned FAIL,
  stated the 990000 net / 10000 shortfall, and ignored the decoy. The model did the BigInt
  arithmetic by hand; it did not need `inspect_payment_response` to get it right.
- `task-09-compliance-scan` (3 planted bugs): **both** arms found all three — and both also
  flagged a 4th real issue (the invented `atomicAmount` field).

**The honest conclusion (confirmed twice): a frontier model gets x402 right without the
plugin, even on hard/tool tasks. There is no capability lift to claim.**

**But the eval surfaced the plugin's actual value — in *how* the arms answered, not pass/fail:**
1. **Grounding / citability.** Pilot's findings cite exact spec sections (`x402-specification-v2.md`
   §5.1.2, `scheme_exact_sui.md`); baseline reasons correctly but ungrounded. For audit /
   compliance / diligence, "FAIL + the exact clause violated" beats "FAIL."
2. **Doesn't volunteer from-memory specifics.** On task-09, baseline offered a specific Sui
   USDC coin type *from memory* as its fix; pilot deferred to *read the asset from the scheme
   definition*. A from-memory on-chain address is exactly the "confident but maybe-stale"
   failure mode that becomes a real-money bug — the plugin's instinct avoids it.
3. **Deterministic verification** (the MCP) and **offline / version-pinned** operation — value
   the eval can't show with a model this strong, but real for CI, air-gapped, and
   protocol-drift cases.

**Positioning that this run supports (and the README/SCOPE now reflect):** x402-pilot is for
*grounded, citable, offline, deterministic* x402 work — **not** a capability crutch. Do not
market a benchmark lift; there isn't one.


