# x402-pilot — working instructions

This repo is a Claude Code plugin that helps developers **build, learn, and verify**
x402 payment-protocol code. It is a developer-assistant, **not** a runtime: it never
moves money or pays for tools (that is `@x402/mcp`'s job).

## When a task touches x402, do this first

1. Read `agents/x402-pilot-agent.md` — it routes the topic to the right corpus and
   carries the iron rules + facilitator lessons.
2. Search the bundled corpus (`Glob` filenames, `Grep` content) before generating
   code. Your training data on x402 is likely stale.
   - `.x402-specs/` — protocol, transports, schemes, extensions, templates (source of truth)
   - `.x402-docs/` — concepts, guides, getting-started, dev-tools
   - `.x402-sdk-docs/` — TS/Python SDK surface
3. Cite the spec file you relied on in your answer.

## Never

- Hardcode a chain id, token/asset address, or decimals — read them from the
  `PaymentRequired` / scheme definition.
- Represent amounts as human decimals; use atomic-integer strings + explicit `decimals`.
- Invent a header, field, or chain parameter that isn't in the corpus.

## Maintenance

The corpus drifts as x402 evolves. Refresh it from upstream with `./sync-specs.sh`
(re-copies `specs/`, `docs/`, and the SDK READMEs from a local x402 checkout).
