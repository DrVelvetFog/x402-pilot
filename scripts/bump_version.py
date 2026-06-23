#!/usr/bin/env python3
"""Bump (or check) the plugin version across every file that carries it.

The version lives in 8 places, in two formats:
  - .claude-plugin/plugin.json        "version"
  - .claude-plugin/marketplace.json   plugins[0].version
  - skills/*/SKILL.md  (x6)           metadata.version (YAML frontmatter)

Usage:
  bump_version.py <new-version>   set every location to <new-version> (semver)
  bump_version.py --check         report current versions; exit 1 on drift

Text-level regex edits keep diffs minimal and formatting intact. Stdlib only
(no jq), consistent with scripts/validate_skills.py.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
JSON_VER = re.compile(r'("version"\s*:\s*")([^"]+)(")')
YAML_VER = re.compile(r'(?m)^(\s*version:\s*")([^"]+)(")\s*$')
SEMVER = re.compile(r"^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*$")

TARGETS = [
    (ROOT / ".claude-plugin" / "plugin.json", JSON_VER),
    (ROOT / ".claude-plugin" / "marketplace.json", JSON_VER),
] + [(f, YAML_VER) for f in sorted((ROOT / "skills").glob("*/SKILL.md"))]


def rel(p):
    return str(p.relative_to(ROOT))


def current(path, rx):
    m = rx.search(path.read_text())
    return m.group(2) if m else None


def cmd_check():
    versions = {rel(p): current(p, rx) for p, rx in TARGETS}
    for k, v in versions.items():
        print(f"  {(v or '(none)'):14} {k}")
    distinct = set(versions.values())
    if None in distinct or len(distinct) != 1:
        print("\nDRIFT: not all locations share one version.", file=sys.stderr)
        return 1
    print(f"\nAll {len(versions)} locations at {distinct.pop()}.")
    return 0


def cmd_bump(new):
    if not SEMVER.match(new):
        print(f"error: '{new}' is not semver (x.y.z)", file=sys.stderr)
        return 2
    changed = 0
    for p, rx in TARGETS:
        text = p.read_text()
        out, n = rx.subn(lambda m: m.group(1) + new + m.group(3), text, count=1)
        if n:
            p.write_text(out)
            changed += 1
            print(f"  -> {new}  {rel(p)}")
        else:
            print(f"  !! no version field found in {rel(p)}", file=sys.stderr)
    print(f"\nBumped {changed}/{len(TARGETS)} files to {new}.")
    print("Next: add a CHANGELOG.md section for this version, then tag the release.")
    return 0 if changed == len(TARGETS) else 1


def main(argv):
    if len(argv) != 1:
        print(__doc__)
        return 2
    return cmd_check() if argv[0] == "--check" else cmd_bump(argv[0])


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
