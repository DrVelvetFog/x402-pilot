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
