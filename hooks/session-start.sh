#!/usr/bin/env bash
# SessionStart hook for x402-pilot.
#
# Speaks up ONLY when the current project looks like an x402 project, so it
# never pollutes unrelated Claude Code sessions. When it fires, it proactively
# points Claude at the routing agent + the doc-first iron rules before any
# x402 work (the same "do this first" posture as CLAUDE.md, but injected up
# front instead of waiting for a phrasing match).
#
# Cross-platform note: macOS/Linux run this directly. For Windows parity, wrap
# it in a polyglot launcher like obra/superpowers' hooks/run-hook.cmd.
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"

# --- cheap x402 detection: dependency manifests + root filenames (shallow) ---
is_x402=0
for mani in package.json pyproject.toml requirements.txt go.mod Cargo.toml; do
  if [ -f "${PROJECT_DIR}/${mani}" ] && grep -qi 'x402' "${PROJECT_DIR}/${mani}" 2>/dev/null; then
    is_x402=1; break
  fi
done
if [ "$is_x402" -eq 0 ] && compgen -G "${PROJECT_DIR}/*x402*" >/dev/null 2>&1; then
  is_x402=1
fi

# Not an x402 project → stay silent.
[ "$is_x402" -eq 1 ] || exit 0

ROOT="${CLAUDE_PLUGIN_ROOT:-the plugin root}"
printf -v MSG '%s\n%s\n%s\n%s\n%s' \
  "This project uses x402. Before writing or reviewing any x402 code:" \
  "1) Read the routing agent at ${ROOT}/agents/x402-pilot-agent.md — it routes the topic and carries the iron rules + facilitator lessons." \
  "2) Search the bundled corpus (.x402-specs / .x402-docs / .x402-sdk-docs) before generating; training data on x402 is likely stale. Cite the spec file you relied on." \
  "3) Never hardcode a chain id, token/asset address, or decimals — read them from PaymentRequired / the scheme. Amounts are atomic-integer strings + explicit decimals." \
  "Skills: /x402-gate /x402-facilitator /x402-verify /x402-scheme /x402-extension /x402-review."

# JSON-escape the message (backslash, quote, newline, tab) via fast param subs.
s="$MSG"
s="${s//\\/\\\\}"; s="${s//\"/\\\"}"; s="${s//$'\n'/\\n}"; s="${s//$'\t'/\\t}"

if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$s"
else
  printf '{"additionalContext":"%s"}\n' "$s"
fi
exit 0
