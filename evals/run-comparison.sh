#!/usr/bin/env bash
# evals/run-comparison.sh — A/B the x402-pilot plugin against a fixed task suite.
#
# Two arms:
#   baseline — `claude -p` in the bare fixture (no x402-pilot). The model alone.
#   pilot    — `claude -p` in the fixture WITH x402-pilot injected: the bundled spec
#              corpus (.x402-specs/.x402-docs/.x402-sdk-docs), the routing agent, the
#              plugin CLAUDE.md, and the real conformance MCP wired via a per-run
#              .mcp.json. This faithfully reproduces "the model + x402-pilot".
#
# Each task is run in a throwaway tmpdir; we diff post-state vs the fixture, capture
# tokens, then auto-score with one more `claude -p` turn into a self-contained HTML report.
#
# Usage:
#   bash evals/run-comparison.sh                      # baseline,pilot + auto-score
#   bash evals/run-comparison.sh --versions pilot     # one arm only
#   bash evals/run-comparison.sh --no-score           # run, skip scoring
#   bash evals/run-comparison.sh --task-ids '^task-0[12]'   # subset by id regex
#   bash evals/run-comparison.sh --resume evals/results/<TS>
#
# This runner uses `--dangerously-skip-permissions` so the unattended agent can edit
# files / call tools without prompts. It only ever operates on throwaway tmpdir copies
# of the fixtures — never your working tree.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TASKS_FILE="$SCRIPT_DIR/tasks.json"
COMPARE_PROMPT="$SCRIPT_DIR/compare-prompt.md"

SCORE=true
RESUME_DIR=""
VERSIONS="baseline,pilot"
TASK_IDS_FILTER=""

usage() { sed -n '2,30p' "${BASH_SOURCE[0]}"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --versions)  VERSIONS="$2"; shift 2 ;;
    --resume)    RESUME_DIR="$2"; shift 2 ;;
    --task-ids)  TASK_IDS_FILTER="$2"; shift 2 ;;
    --no-score)  SCORE=false; shift ;;
    -h|--help)   usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage >&2; exit 1 ;;
  esac
done

# ---- Pre-flight ----------------------------------------------------------
for cmd in claude jq git diff mktemp; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "ERROR: '$cmd' not on PATH." >&2; exit 1; }
done
[[ -f "$TASKS_FILE" ]] || { echo "ERROR: $TASKS_FILE missing" >&2; exit 1; }
[[ -f "$PLUGIN_ROOT/mcp/x402-conformance-mcp/dist/index.js" ]] \
  || echo "NOTE: conformance MCP dist not built; pilot arm will run corpus-only. Build with: (cd mcp/x402-conformance-mcp && npm i && npm run build)" >&2

if [[ -n "$RESUME_DIR" ]]; then
  [[ -d "$RESUME_DIR" ]] || { echo "ERROR: --resume $RESUME_DIR not a directory" >&2; exit 1; }
  RESULTS_DIR="$RESUME_DIR"
else
  RESULTS_DIR="$SCRIPT_DIR/results/$(date -u +%Y-%m-%dT%H-%M-%SZ)"
fi
mkdir -p "$RESULTS_DIR"
echo "Results directory: $RESULTS_DIR"

# ---- Inject x402-pilot into a pilot-arm tmpdir ---------------------------
inject_pilot() {
  local tmpdir="$1"
  for d in .x402-specs .x402-docs .x402-sdk-docs; do
    [[ -d "$PLUGIN_ROOT/$d" ]] && cp -a "$PLUGIN_ROOT/$d" "$tmpdir/"
  done
  mkdir -p "$tmpdir/agents"
  cp -a "$PLUGIN_ROOT/agents/." "$tmpdir/agents/" 2>/dev/null || true
  cp "$PLUGIN_ROOT/CLAUDE.md" "$tmpdir/CLAUDE.md" 2>/dev/null || true
  if [[ -f "$PLUGIN_ROOT/mcp/x402-conformance-mcp/dist/index.js" ]]; then
    cat > "$tmpdir/.mcp.json" <<EOF
{ "mcpServers": { "x402-conformance": { "command": "node", "args": ["$PLUGIN_ROOT/mcp/x402-conformance-mcp/dist/index.js"], "env": { "CLAUDE_PLUGIN_ROOT": "$tmpdir" } } } }
EOF
  fi
}

# ---- Run one task for one arm -------------------------------------------
run_one_task() {
  local version="$1" id="$2" fixture="$3" prompt="$4"
  if [[ -s "$RESULTS_DIR/$version/$id.diff" ]]; then
    echo "[$version] $id  (skip: already captured)"; return 0
  fi
  echo "[$version] $id  ($(date -u +%H:%M:%S))"
  local tmpdir; tmpdir=$(mktemp -d -t "x402-pilot-eval.XXXXXX")
  cp -a "$SCRIPT_DIR/$fixture/." "$tmpdir/"
  local env_root=""
  if [[ "$version" == "pilot" ]]; then inject_pilot "$tmpdir"; env_root="$tmpdir"; fi

  local exit_code=0
  (cd "$tmpdir" && CLAUDE_PLUGIN_ROOT="$env_root" claude -p --output-format json \
      --dangerously-skip-permissions "$prompt" < /dev/null) \
    > "$RESULTS_DIR/$version/$id.raw.json" \
    2> "$RESULTS_DIR/$version/$id.err" || exit_code=$?

  jq -r '.result // .text // ""' "$RESULTS_DIR/$version/$id.raw.json" 2>/dev/null \
    > "$RESULTS_DIR/$version/$id.out" \
    || cp "$RESULTS_DIR/$version/$id.raw.json" "$RESULTS_DIR/$version/$id.out"
  jq -c '.usage // {}' "$RESULTS_DIR/$version/$id.raw.json" 2>/dev/null \
    > "$RESULTS_DIR/$version/$id.tokens" || echo '{}' > "$RESULTS_DIR/$version/$id.tokens"

  # Diff only the fixture's own files (exclude the injected corpus/agent/mcp).
  diff -ruN --exclude='.x402-*' --exclude='agents' --exclude='CLAUDE.md' --exclude='.mcp.json' \
    "$SCRIPT_DIR/$fixture" "$tmpdir" > "$RESULTS_DIR/$version/$id.diff" 2>/dev/null || true
  echo "[$version/$id] end $(date -u +%H:%M:%S) exit=$exit_code" >> "$RESULTS_DIR/run.log"
  rm -rf "$tmpdir"
}

# ---- Run one arm ---------------------------------------------------------
run_one_version() {
  local version="$1"
  echo ""; echo "=== arm: $version ==="
  mkdir -p "$RESULTS_DIR/$version"
  local n; n=$(jq 'length' "$TASKS_FILE"); local i=0
  while IFS= read -r task; do
    i=$((i+1))
    local id fixture prompt
    id=$(echo "$task" | jq -r .id)
    [[ -n "$TASK_IDS_FILTER" && ! "$id" =~ $TASK_IDS_FILTER ]] && continue
    fixture=$(echo "$task" | jq -r .fixturePath)
    prompt=$(echo "$task" | jq -r .prompt)
    echo "[$version] [$i/$n] $id"
    run_one_task "$version" "$id" "$fixture" "$prompt"
  done < <(jq -c '.[]' "$TASKS_FILE")
}

IFS=',' read -ra ARMS <<< "$VERSIONS"
for v in "${ARMS[@]}"; do
  case "$v" in
    baseline|pilot) run_one_version "$v" ;;
    *) echo "ERROR: unknown arm '$v' (baseline|pilot)" >&2; exit 1 ;;
  esac
done

# ---- Aggregate tokens ----------------------------------------------------
{
  echo "arm,task_id,input_tokens,output_tokens,cache_creation_input_tokens,cache_read_input_tokens"
  for v in "${ARMS[@]}"; do
    [[ -d "$RESULTS_DIR/$v" ]] || continue
    for tfile in "$RESULTS_DIR/$v"/*.tokens; do
      [[ -e "$tfile" ]] || continue
      jq -r --arg v "$v" --arg id "$(basename "$tfile" .tokens)" \
        '[$v,$id,(.input_tokens//0),(.output_tokens//0),(.cache_creation_input_tokens//0),(.cache_read_input_tokens//0)]|@csv' \
        "$tfile" 2>/dev/null || true
    done
  done
} > "$RESULTS_DIR/tokens.csv"

echo ""; echo "=== runs complete → $RESULTS_DIR ==="

# ---- Auto-score ----------------------------------------------------------
if [[ "$SCORE" == "true" ]]; then
  [[ -f "$COMPARE_PROMPT" ]] || { echo "WARN: $COMPARE_PROMPT missing; skip score." >&2; exit 0; }
  echo "=== scoring with claude -p ==="
  prompt=$(cat "$COMPARE_PROMPT")
  prompt="${prompt//RESULTS_DIR_PLACEHOLDER/$RESULTS_DIR}"
  prompt="${prompt//TASKS_FILE_PLACEHOLDER/$TASKS_FILE}"
  prompt="${prompt//VERSIONS_PLACEHOLDER/$VERSIONS}"
  claude -p --dangerously-skip-permissions "$prompt" > "$RESULTS_DIR/score.html"
  echo "Scored report: $RESULTS_DIR/score.html"
fi
echo "Done."
