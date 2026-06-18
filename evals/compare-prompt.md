You are scoring a 2-arm A/B comparison of the **x402-pilot** plugin against a fixed task
suite. Each arm was given the same prompt against the same fixture; the only difference is
whether x402-pilot was active.

Arms (subset depending on what the runner was asked to do):

- `baseline` — `claude -p` in the bare fixture. The model alone, no x402-pilot.
- `pilot` — `claude -p` in the fixture with x402-pilot injected: the bundled spec corpus
  (`.x402-specs/.x402-docs/.x402-sdk-docs`), the routing agent, the plugin `CLAUDE.md`, and
  the conformance MCP (`mcp__x402-conformance__*`) wired via a per-run `.mcp.json`.

Inputs:

- Tasks file: `TASKS_FILE_PLACEHOLDER` (JSON array; each entry has `id`, `title`,
  `fixturePath`, `prompt`, optional `category`, `passCriteria`, `rubric`)
- Results root: `RESULTS_DIR_PLACEHOLDER`
  - `<arm>/<task-id>.out` — model text (extracted from the claude -p JSON)
  - `<arm>/<task-id>.diff` — `diff -ruN` of fixture vs post-run tmpdir; the canonical
    "what the model did" artefact. Reconstruct the post-state of the target file from the
    right-hand (`+`) side of the diff.
  - `<arm>/<task-id>.tokens` — JSON usage block
- `tokens.csv` — aggregated per-task per-arm usage.
- Arms actually run: `VERSIONS_PLACEHOLDER`.

## Scoring procedure

For each task, for each arm that was actually run, decide PASS / FAIL by applying the
criteria **in order** (first failing criterion is the reason; otherwise PASS):

1. **Target file edited.** If `passCriteria.file` does not appear as a modified file in
   `<arm>/<id>.diff`, FAIL with "no edit to target file".
2. **Content criteria** on the target file's post-state:
   - `passCriteria.containsRegex` must match (Perl-compatible).
   - `passCriteria.doesNotContainRegex` must NOT match anywhere in the post-state, **excluding
     comment lines** (`//`, `#`, `/* */`) — a value that only appears in a comment is not an
     implementation, and a stale value left only in a comment should not fail the task.
   - `passCriteria.alsoContainsRegex` must match if present.
3. **Rubric** (only when the task has a `rubric` block): score each criterion on the
   `passCriteria.file` post-state using the criterion text as the lens, on the given `scale`.
   Sum. PASS if `sum >= rubric.passThreshold`, else FAIL with `"rubric: <sum>/<max>"`.

If multiple criteria fail, report the *first*.

## Output

Emit a single self-contained HTML document to stdout (semantic HTML5, inline `<style>` only,
system font, restrained palette). Structure:

```html
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>x402-pilot eval comparison</title>
<style>/* tasteful inline CSS */</style></head><body>
<h1>x402-pilot eval comparison</h1>
<p><strong>Arms:</strong> ...  <strong>Tasks:</strong> N  <strong>Date:</strong> ...</p>

<h2>Headline</h2>
<table>
  <thead><tr><th></th><th>baseline</th><th>pilot</th></tr></thead>
  <tbody>
    <tr><th>Pass rate</th><td>N/M</td><td>N/M</td></tr>
    <tr><th>Total output tokens</th><td>...</td><td>...</td></tr>
  </tbody>
</table>

<h2>Per-task</h2>
<table>
  <thead><tr><th>Task</th><th>Category</th><th>baseline</th><th>pilot</th><th>Reason / note</th></tr></thead>
  <tbody><!-- one row per task: ✓ / ✗ per arm, and the proximate reason for any FAIL --></tbody>
</table>

<h2>Reading the delta</h2>
<p><!-- 2-4 sentences: where pilot beat baseline and WHY (which stale-training fact the corpus
supplied — e.g. SUI 9 decimals vs the USDC 6-decimal habit, v2 PAYMENT-SIGNATURE vs v1
X-PAYMENT, net-balance vs output-parsing). Call out any task where both passed or both failed,
honestly. Do not inflate the result. --></p>
</body></html>
```

Be precise and honest. The interesting signal is **which stale-training traps the pilot arm
clears that the baseline arm walks into** — name them.
