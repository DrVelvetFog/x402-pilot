#!/usr/bin/env bash
# Refresh the bundled x402 corpus from a local x402 checkout.
# Usage: ./sync-specs.sh [path-to-x402-checkout]
# Default checkout path: ../x402-fork  (override with $1 or $X402_SRC)
set -euo pipefail

SRC="${1:-${X402_SRC:-../x402-fork}}"
HERE="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$SRC/specs" ]; then
  echo "error: '$SRC' does not look like an x402 checkout (no specs/ dir)." >&2
  echo "Pass the path: ./sync-specs.sh /path/to/x402" >&2
  exit 1
fi

echo "Syncing x402 corpus from: $SRC"
rm -rf "$HERE/.x402-specs" "$HERE/.x402-docs"
cp -R "$SRC/specs" "$HERE/.x402-specs"
cp -R "$SRC/docs"  "$HERE/.x402-docs"

mkdir -p "$HERE/.x402-sdk-docs"
cp "$SRC/typescript/packages/core/README.md"       "$HERE/.x402-sdk-docs/ts-core.md"
cp "$SRC/typescript/packages/mcp/README.md"         "$HERE/.x402-sdk-docs/ts-mcp.md"
cp "$SRC/typescript/packages/extensions/README.md"  "$HERE/.x402-sdk-docs/ts-extensions.md"
cp "$SRC/python/x402/README.md"                     "$HERE/.x402-sdk-docs/python-x402.md"

# Keep the upstream license alongside the bundled corpus
cp "$SRC/LICENSE" "$HERE/LICENSE"

COUNT=$(find "$HERE/.x402-specs" "$HERE/.x402-docs" "$HERE/.x402-sdk-docs" -type f | wc -l | tr -d ' ')
UPSTREAM_REV=$(git -C "$SRC" rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "Done: $COUNT files bundled (upstream @ $UPSTREAM_REV)."
echo "Review the diff and commit if the corpus changed."
