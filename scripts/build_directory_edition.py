#!/usr/bin/env python3
"""Build the skills-only "directory edition" of x402-pilot.

Anthropic's plugin directory only accepts Markdown, text, JSON, YAML and images
from unverified publishers: no hooks, no local MCP servers, no scripts, and only
plain `key: value` frontmatter. This script copies the parts of x402-pilot that
fit those rules into directory/x402-pilot-skills/ so the directory listing stays
in sync with the main plugin.

  python3 scripts/build_directory_edition.py          # rebuild the folder
  python3 scripts/build_directory_edition.py --check  # exit 1 if it is stale

Stdlib only.
"""
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "directory" / "x402-pilot-skills"
REPO = "https://github.com/DrVelvetFog/x402-pilot"

# Corpus folders are renamed: hidden dot-folders don't survive every upload path.
CORPUS = {".x402-specs": "reference/specs", ".x402-docs": "reference/docs", ".x402-sdk-docs": "reference/sdk-docs"}
KEEP_FRONTMATTER = ("name", "description")
MAX_BYTES = 256 * 1024

NOTE = (
    "> **Directory edition.** This edition ships the skills, commands, agent and spec corpus only. "
    "The `mcp__x402-conformance__*` tools named below come with the full plugin and aren't bundled here. "
    "If they aren't available, do the same check by hand from the spec (curl and the chain's RPC where a "
    "live call is needed) and tell the user which steps you did manually. Full plugin: " + REPO + "\n"
)

# Upstream guides left out because the directory's secret scan blocks their sample key
# material (env-var private keys, a literal PEM header). The matching protocol spec stays.
EXCLUDE = {".x402-docs/extensions/offer-receipt.mdx"}


def rewrite_paths(text: str) -> str:
    for old, new in CORPUS.items():
        text = text.replace(old + "/", new + "/")
    return re.sub(r"(\b[\w./-]+)\.mdx\b", r"\1.md", text)


def clean_frontmatter(text: str) -> str:
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if not m:
        return text
    kept = [ln for ln in m.group(1).splitlines() if re.match(r"(%s):" % "|".join(KEEP_FRONTMATTER), ln)]
    return "---\n" + "\n".join(kept) + "\n---\n" + text[m.end():]


def add_note(text: str) -> str:
    if "mcp__x402-conformance__" not in text:
        return text
    m = re.match(r"---\n.*?\n---\n", text, re.S)
    head, body = (text[: m.end()], text[m.end():]) if m else ("", text)
    return head + "\n" + NOTE + body


def write(dest: Path, text: str) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding="utf-8")


def build(out: Path) -> None:
    if out.exists():
        shutil.rmtree(out)
    for folder in ("skills", "commands", "agents"):
        for src in sorted((ROOT / folder).rglob("*.md")):
            text = add_note(clean_frontmatter(rewrite_paths(src.read_text(encoding="utf-8"))))
            write(out / src.relative_to(ROOT), text)
    for old, new in CORPUS.items():
        for src in sorted((ROOT / old).rglob("*")):
            if not src.is_file() or src.suffix not in (".md", ".mdx"):
                continue  # drops docs.json (site navigation config, not documentation)
            if str(src.relative_to(ROOT)) in EXCLUDE:
                continue
            text = rewrite_paths(src.read_text(encoding="utf-8"))
            rel = src.relative_to(ROOT / old).with_suffix(".md")
            write(out / new / rel, text)
    write(out / "llms.txt", rewrite_paths((ROOT / "llms.txt").read_text(encoding="utf-8")))
    shutil.copy(ROOT / "LICENSE", out / "LICENSE")
    (out / ".claude-plugin").mkdir(parents=True, exist_ok=True)
    shutil.copy(ROOT / ".claude-plugin" / "icon.png", out / ".claude-plugin" / "icon.png")

    main = json.loads((ROOT / ".claude-plugin" / "plugin.json").read_text())
    manifest = {
        "name": "x402-pilot-skills",
        "displayName": "x402-pilot (skills edition)",
        "description": "Skills, commands and a routing agent for building, reviewing and verifying x402 payment-protocol code, with the x402 spec corpus bundled for offline search. The skills-only edition of x402-pilot.",
        "version": main["version"],
        "author": main["author"],
        "homepage": REPO,
        "repository": REPO,
        "license": main["license"],
        "keywords": [k for k in main["keywords"] if k != "mcp"],
    }
    write(out / ".claude-plugin" / "plugin.json", json.dumps(manifest, indent=2) + "\n")
    write(out / "README.md", (ROOT / "scripts" / "directory-edition-README.md").read_text(encoding="utf-8").replace("{version}", main["version"]))
    write(out / "NOTICE", (ROOT / "NOTICE").read_text(encoding="utf-8") + (
        "\nDirectory edition (directory/x402-pilot-skills/): the bundled x402 material is\n"
        "copied into reference/ instead of .x402-*/, .mdx files are renamed to .md (and\n"
        "links to them updated), and docs.json and the docs/extensions/offer-receipt\n"
        "guide are omitted. The offer-and-receipt protocol spec is still included in\n"
        "reference/specs/extensions/.\n"
    ))

    big = [p for p in out.rglob("*") if p.is_file() and p.suffix != ".png" and p.stat().st_size > MAX_BYTES]
    if big:
        sys.exit("files over 256 KiB: " + ", ".join(str(p.relative_to(out)) for p in big))


def snapshot(d: Path) -> dict:
    return {str(p.relative_to(d)): p.read_bytes() for p in d.rglob("*") if p.is_file()}


if __name__ == "__main__":
    if "--check" in sys.argv:
        with tempfile.TemporaryDirectory() as tmp:
            build(Path(tmp) / "x")
            stale = not OUT.exists() or snapshot(Path(tmp) / "x") != snapshot(OUT)
        print("directory edition is " + ("STALE: run scripts/build_directory_edition.py" if stale else "up to date"))
        sys.exit(1 if stale else 0)
    build(OUT)
    print(f"built {OUT.relative_to(ROOT)}: {sum(1 for p in OUT.rglob('*') if p.is_file())} files")
