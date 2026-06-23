#!/usr/bin/env python3
"""Validate plugin SKILL.md files against the Agent Skills spec.

Checks the spec's hard rules (https://agentskills.io/specification):
  - SKILL.md present, with `---` YAML frontmatter
  - name: required, 1-64 chars, ^[a-z0-9]+(-[a-z0-9]+)*$, == parent dir name
  - description: required, 1-1024 chars

Stdlib only, no third-party deps. Swap in the official `skills-ref validate`
upstream if/when its canonical distribution is pinned. Exit non-zero on any
failure so it can gate CI.
"""
import pathlib
import re
import sys

NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
SKILLS_DIR = pathlib.Path(__file__).resolve().parent.parent / "skills"


def frontmatter(text):
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    try:
        close = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        return None
    fields = {}
    for line in lines[1:close]:
        if line[:1].isspace() or ":" not in line:
            continue  # skip nested (metadata) and non key:value lines
        key, val = line.split(":", 1)
        fields[key.strip()] = val.strip().strip('"').strip("'")
    return fields


def main():
    errors = []
    skills = sorted(p for p in SKILLS_DIR.iterdir() if p.is_dir())
    if not skills:
        print(f"no skills found under {SKILLS_DIR}", file=sys.stderr)
        return 1
    for d in skills:
        f = d / "SKILL.md"
        if not f.exists():
            errors.append(f"{d.name}: missing SKILL.md")
            continue
        fm = frontmatter(f.read_text())
        if fm is None:
            errors.append(f"{d.name}: missing or malformed --- frontmatter ---")
            continue
        name = fm.get("name", "")
        desc = fm.get("description", "")
        if not name:
            errors.append(f"{d.name}: frontmatter missing `name`")
        else:
            if not NAME_RE.match(name) or len(name) > 64:
                errors.append(f"{d.name}: invalid name {name!r} (lowercase/digits/hyphens, <=64)")
            if name != d.name:
                errors.append(f"{d.name}: name {name!r} != directory name {d.name!r}")
        if not desc:
            errors.append(f"{d.name}: frontmatter missing `description`")
        elif not (1 <= len(desc) <= 1024):
            errors.append(f"{d.name}: description length {len(desc)} out of range 1-1024")
        if not any(e.startswith(d.name + ":") for e in errors):
            print(f"OK  {d.name}  (desc {len(desc)} chars)")

    if errors:
        print("\nFAIL:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1
    print(f"\nAll {len(skills)} skills valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
