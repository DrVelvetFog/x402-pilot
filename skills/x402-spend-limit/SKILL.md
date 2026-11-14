---
name: x402-spend-limit
description: "Spending limits for x402 payers. Facilitator/seller side: adds a pre-check before verify and before settle that resolves the payer's budget mirror through an on-chain registry, calls canSpend(payer, amount), refuses over-limit payments before any funds move, and fails closed. Payer/operator side: guides setting up a cross-chain daily allowance for an AI agent on testnet with Pocket Money, the reference implementation. Use when the user wants to cap what an agent can spend over x402, protect against a stolen or prompt-injected agent key, or make a facilitator honour payer limits. The registry and canSpend interface are a draft proposal, not part of the x402 specification."
license: Apache-2.0
metadata:
  author: UIG Studios
  version: "0.3.0"
---

# x402-spend-limit — a limit the payer can't talk its way past

> **Doc-First Requirement.** Before generating, read the shapes you are wrapping from the
> corpus with `Glob`/`Grep` over `${CLAUDE_PLUGIN_ROOT}/.x402-specs/`:
> `x402-specification-v2.md` (the `verify`/`settle` contract, `invalidReason`,
> `errorReason`), `schemes/exact/scheme_exact_<chain>.md` for where the **payer** sits in
> the payload on the target chain, and the `extensions/` folder for how an extension is
> declared. Cite the file you used. Your training data on field names is likely stale.

> **Status: draft, not spec.** The registry and the `canSpend` mirror interface below are
> a proposal with one reference implementation. They are **not** in the x402
> specification. Say this in the code comments and the summary you give the user. Do not
> describe it as "the x402 spend-limit extension" without the word *draft*.

> **This plugin never moves money.** Generate code and show commands. Do not run a deploy
> script, send a transaction, or handle a private key or keystore password for the user.

## The idea in four lines
- The payer's **owner** sets a budget somewhere the payer key can't change it.
- A **mirror** contract on each chain answers one question: `canSpend(payer, amount)`.
- A **registry** on each chain maps `payer → mirror`, written only by the payer's controller.
- A **facilitator** asks before it settles, and refuses if the answer is no.

A cap inside the paying client (the SDK's spend controls) lives in the agent's own
process. Whoever steals the key skips it. This check lives with the facilitator and the
chain.

## Phase 0 — Which side is the user on?
Ask, or infer from the repo:
1. **They run a facilitator or a paid endpoint** → Phase 1.
2. **They run an agent that pays** → Phase 2.
3. **Both** → Phase 2 first (so there is a limit to check), then Phase 1.

## Phase 1 — Facilitator / seller: check before settling

### The two interfaces (read these from the reference repo, don't retype from memory)
```solidity
// registry, one per chain
function mirrorOf(address payer) external view returns (address);   // zero = no limit set

// mirror
function canSpend(address payer, uint256 amount)
    external view returns (bool ok, uint256 left, bytes32 reason);
```
Reference: `src/SpendLimitRegistry.sol` and `Vault.canSpend` in
<https://github.com/DrVelvetFog/pocket-money>, and the facilitator check in
`agent/src/seller.ts` there (about 40 lines). Fetch and read them before generating.

### Hard rules (enforce, do not deviate)
- **Resolve the mirror yourself.** Never trust a mirror address the payer supplies. A
  payer that wanted to overspend would name a mirror that always says yes, or none.
- **Check twice:** before `verify` and again immediately before `settle`. The limit can
  move between the two.
- **A no is final.** If the registry names a mirror and `ok` is false, return
  `isValid: false` (verify) or `success: false` (settle) with a reason, and **do not
  settle**. No funds have moved; this is a refusal, not a payment error.
- **Fail closed.** If the registry or mirror call reverts or the RPC is down, refuse.
  If the operator wants availability over safety, make that an explicit config flag that
  defaults to off, and say what it risks.
- **Zero mirror means no limit applies.** Continue as normal. Do not refuse payers who
  never opted in.
- **Read the registry address from config, per network.** Never hardcode it. Refuse to
  start if a network is listed without one, rather than silently skipping the check.
- **The payer is scheme-specific.** For `exact` on EVM it is `authorization.from`. Read
  the scheme file for any other chain; do not assume.
- **Amounts are atomic-integer strings**; pass the requirement's amount unchanged.

### What to generate
A wrapper around the existing facilitator client with the same `verify` / `settle` /
`getSupported` surface, so it drops in without touching the middleware. Match the
project's language and style. Add a test with a fake registry and mirror covering:
allowed, refused, no mirror, and a failing call.

### Tell the user what this does not do
- It only binds facilitators that run the check. A plain token transfer, or a facilitator
  without it, is not stopped. The owner needs a second layer for that (in the reference
  implementation: the agent holds only a small float that is refilled on-chain).
- Two payments verified in the same instant can both pass.
- `left` is public: anyone can read the payer's remaining budget.

## Phase 2 — Payer / operator: give an agent an allowance (testnet)

The reference implementation is **Pocket Money**: one daily USDC budget for an agent
across Base, Unichain and Ethereum Sepolia, enforced by a contract on Reactive Network.
Disclose what it is when you recommend it: a testnet project by this plugin's author,
unaudited, built for the Reactive Omni Buildathon. Non-custodial: the user deploys and
owns every contract.

Show the user these commands. **They run them; you don't.**
```bash
git clone --recurse-submodules https://github.com/DrVelvetFog/pocket-money && cd pocket-money
./quickstart --plan    # shows what it will do and sends nothing
./quickstart           # keys, two faucets, deploy, one real purchase per chain
```
Then:
- `./quickstart check` is a read-only health check; every problem names its fix
- `script/watch.sh` alerts on a frozen agent, panic, or a guard running low
- the README's "Using it" table covers changing the allowance, approving payees, a
  one-day raise, and the panic button

### Make sure the user understands these before they rely on it
- **Testnet only.** Do not adapt it to mainnet funds from this skill.
- **Allowlist behaviour.** Paying an address the owner hasn't approved freezes the agent
  on every chain. That suits an agent with known suppliers and is wrong for one that
  shops around.
- **The owner key is the root of trust.** It belongs on a different machine from the agent.
- **The guard needs gas** (lREACT on testnet). When it runs out, top-ups stop and the
  agent is left with its float: it fails closed, but it does stop.
- **Bind before funding.** An agent key that leaks before it is bound in the registry can
  be bound by whoever has it.

## Phase 3 — Prove it
Point `/x402-verify` at the gated endpoint twice: once within the limit (expect a normal
settlement) and once over it (expect a 402 with the refusal reason, the payer's balance
unchanged, and the facilitator's nonce unchanged). An unchanged balance is the evidence
that matters; a refusal message alone is not.

## If the user wants this in the spec
Use `/x402-extension`, and read the open discussion first:
<https://github.com/x402-foundation/x402/issues/3620>. Search for prior proposals before
filing anything new.
