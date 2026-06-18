# x402-pilot — Scope

*Draft 2026-06-18. A Claude Code plugin that is the **developer-assistant** for building on the x402 payment protocol — the empty lane next to the official runtime `@x402/mcp`. Modeled 1:1 on the anatomy of `sui-pilot` (which is a dev-assistant plugin for the Sui/Move stack).*

## Strategic frame (why build this)
- **The gap is real.** x402 is a 2025–26 protocol; model training data on it is thin and frequently wrong. There is an official **runtime** MCP (`@x402/mcp` — lets you build paid MCP tools and auto-pay from MCP clients) but **no developer-assistant**: nothing that teaches the spec surface, scaffolds a spec-compliant integration, or *verifies* a facilitator end-to-end. `sui-pilot` proved that shape is valuable for an ecosystem.
- **It showcases exactly the author's credibility.** Built the **first x402 facilitator on Sui**, contributor in the `exact`-scheme + receipt-extension lane (x402#2648), and PR author to the directory (x402#2619). A facilitator/scheme/extension authoring toolkit turns that expertise into community infrastructure.
- **Ownership:** unlike `sui-pilot` (Alvaro Lillo's, MystenLabs), this is **fully owned by UIG Studios** — a clean distribution asset.
- **Goal:** a high-signal community gift → cement value to the x402 / Coinbase team → paid contract / Foundation-tooling adoption.

## Hard differentiator vs `@x402/mcp`
`@x402/mcp` is a **library you depend on at runtime** (paid tool calls, client auto-pay). `x402-pilot` is a **dev-time assistant** you talk to inside Claude Code. No overlap. The plugin should *teach* `@x402/mcp` as one of its corpora, not reimplement it.

## Anatomy — mapped against the real sui-pilot layout

| sui-pilot has | x402-pilot equivalent | Build type |
|---|---|---|
| `.claude-plugin/plugin.json` (+ `mcpServers` wiring) | same manifest, auto-wires the conformance MCP | config |
| **6 doc corpora, ~747 files** | **bundled x402 spec corpus** (see §1) | bundle + sync script |
| **2 MCP servers** (move-lsp, sui-prover) | **1 conformance MCP** (see §2) | the real code |
| **6 commands** | **~7 commands** (see §3) | markdown |
| **5 skills** mirroring commands | same | markdown |
| **1 routing agent** | `x402-pilot-agent.md` (routes corpora + enforces contributing rules) | markdown |
| **evals/** (BASELINE.md, tasks.json, fixtures) | same eval harness | markdown + script |
| `llms.txt`, `CLAUDE.md`, README, tour | same distribution layer | markdown/html |
| `sync-docs.sh` | `sync-specs.sh` (corpus drifts as x402 evolves) | script |

## §1 — Bundled spec corpus (the RAG layer)
x402's real knowledge lives in `specs/`, not `docs/` (only 31 files). Bundle, searchable via Glob/Grep, fronted by `llms.txt`:
- **Core:** `x402-specification-v1.md`, `-v2.md`, transports (http/mcp/a2a, v1 + v2)
- **Schemes:** `exact` across 12 chains (evm, sui, svm, aptos, ton, near, stellar, hedera, algo, concordium, cardano, keeta) + `upto`, `auth-capture`, `batch-settlement`
- **Extensions:** bazaar, gas-sponsoring (eip2612/erc20), **offer-and-receipt** (the #2648 lane), sign-in-with-x, builder_code, payment_identifier, auth-hints, http-message-signatures
- **Templates + process:** `scheme_template.md`, `scheme_impl_template.md`, `transport_template.md`, `specs/CONTRIBUTING.md` (3-PR new-chain / spec-first new-scheme workflow)
- **SDK surface:** core / extensions / mcp READMEs (TS), python, go, java
- License: x402 is Apache-2.0 — bundle with NOTICE + attribution to x402-foundation/x402, preserve LICENSE.

## §2 — Conformance MCP (the sui-pilot "LSP/prover" analog)
Executable verbs no other tool gives an agent; thin wrappers over the existing SDK + the author's e2e harness:
- `decode_402` — parse/validate a `PaymentRequired` (402), explain each field
- `build_payment_payload` / `verify_payment_payload` — construct & check a `PaymentPayload` vs a scheme
- `inspect_payment_response` — validate a `PAYMENT-RESPONSE` (the object hand-checked in #2648)
- `run_conformance` — verify → settle → idempotency → tampered/underpay-rejection against a facilitator URL (productized from the live 12/12 e2e)
- `validate_extension` — check an extension payload vs its declared schema
- `lint_scheme_spec` — diff a draft scheme vs `scheme_template.md`
- `check_compliance` — flag hardcoded chain/token/decimals (enforces reference_x402_contributing rules)

## §3 — Commands / skills
- `/x402-gate` — scaffold a paid endpoint (express/hono/next/flask/fastapi — real e2e templates)
- `/x402-facilitator` — scaffold/verify a facilitator (Sui lessons baked in: net-balance assertion, spent-coin check, idempotent double-settle)
- `/x402-scheme` — author a new-chain scheme from template (3-PR workflow)
- `/x402-extension` — author an extension (offer/receipt lane)
- `/x402-review` — spec-compliance review (never hardcode chain/token/decimals)
- `/x402-verify` — run the conformance flow against a live/local facilitator
- `/x402-pilot` — help / router
Each command mirrored as a skill so it triggers contextually.

## Build phasing
- **Phase 0 — corpus + agent + llms.txt + plugin.json + CLAUDE.md + README** (~1 day). Instantly useful, zero engineering risk. *Shippable as a standalone community gift.*
- **Phase 1 — commands + skills** (~1 day, markdown).
- **Phase 2 — conformance MCP** (~2–3 days, the only real code; thin wrappers over SDK + e2e harness).
- **Phase 3 — evals + README/tour + announce** (~1 day).
≈ a focused week total; Phase 0 stands alone.

## Honest brakes / decision points
1. **New repo** — against the "no new repo until traction" standing rule. The strategy (gift → team → paid work) is the named exception, not a wave-past.
2. **Maintenance tail** — corpus drifts; owner commits to a `sync-specs.sh` cadence.
3. **Don't duplicate `@x402/mcp`** — dev-assistant only.
4. **Foundation politics (upside)** — built to Foundation conventions (signed commits, conventional commits, disclose AI usage), this is pitchable as semi-official tooling → the version that most directly converts to "on the team."

## Provenance
- sui-pilot anatomy reverse-engineered from `/Users/tonyjagodka/sui-pilot` (2026-06-18).
- x402 surface mapped from `/Users/tonyjagodka/x402-fork` (specs/, docs/, typescript/packages/{core,mcp,extensions}, e2e/).
- Related memory: [[reference_x402_contributing]], [[project_sui_signal_api]], [[roadmap_oss_leverage]].
