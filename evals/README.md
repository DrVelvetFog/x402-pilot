# x402-pilot eval suite

Empirical A/B: does **x402-pilot** make the model produce spec-compliant x402 code on tasks
where pre-x402 training is stale or wrong?

## One command

```bash
bash evals/run-comparison.sh
```

Runs every task in `tasks.json` against two arms, captures what the model changed in each
fixture, then auto-invokes `claude -p` once more to score the delta into
`results/<timestamp>/score.html`. Zero commands between launch and reading the report.

## The two arms

| Arm | What runs |
|---|---|
| `baseline` | `claude -p` in the bare fixture — the model alone, no x402-pilot. |
| `pilot` | `claude -p` in the fixture with x402-pilot **injected**: the bundled corpus (`.x402-specs/.x402-docs/.x402-sdk-docs`), the routing agent, the plugin `CLAUDE.md`, and the conformance MCP wired via a per-run `.mcp.json`. |

This is a faithful, self-contained reproduction of "model + x402-pilot" vs "model alone" — it
does not depend on your global plugin install state. The runner only ever edits throwaway
tmpdir copies of the fixtures, never your working tree.

## Prerequisites

- `claude` CLI on PATH (`claude -p` non-interactive)
- `jq`, `git`, `diff`, `mktemp`
- The conformance MCP built (`cd mcp/x402-conformance-mcp && npm i && npm run build`) — if
  absent, the `pilot` arm still runs corpus-only and the runner says so.

The runner uses `--dangerously-skip-permissions` so the unattended agent can edit files and
call tools without prompts. Safe here: it operates only on throwaway tmpdir fixture copies.

## The tasks (7)

Each is a **stale-training trap** — see `BASELINE.md` for the per-task "trap vs corpus fact"
table. Six are graded by tight regex on the post-state diff (comments excluded, so a stale
value left only in a comment neither passes nor fails spuriously); one (`task-07`) is
rubric-graded for the receipt-binding pattern from x402#2648.

## Files

| File | Purpose |
|---|---|
| `run-comparison.sh` | The runner. `--versions baseline,pilot`, `--task-ids REGEX`, `--resume DIR`, `--no-score`. |
| `tasks.json` | Task definitions: `id`, `title`, `fixturePath`, `prompt`, `passCriteria`, optional `rubric`. |
| `fixtures/<task>/` | Starting state for each task (a tiny TS stub with the trap baked in). |
| `compare-prompt.md` | The scoring template, piped to `claude -p` after both arms run. Emits self-contained HTML. |
| `BASELINE.md` | Preserved scored runs + the trap/corpus-fact table. |
| `results/<TS>/` | Per-run output. Gitignored. |

## Adding a task

1. Create `fixtures/<your-task>/` with a starting stub (the layout the model would see).
2. Add an entry to `tasks.json` (`passCriteria.containsRegex` / `doesNotContainRegex` /
   `alsoContainsRegex`, or a `rubric` block for open-ended tasks).
3. Re-run. No code changes.

## Output

You only need to read `results/<TS>/score.html`. The `.diff` / `.out` / `.tokens` files are
kept for spot-checking a surprising result.
