#!/usr/bin/env bash
# This repo is public and its skills are copied into public repos. Fails when
# a tracked file names something private to Langmail's platform repo: the repo
# itself, its infrastructure, monitoring or priorities. A fact about one repo
# goes in that repo's AGENTS.md (## Factory) instead.
set -euo pipefail
cd "$(dirname "$0")/.."

pattern='langmail/platform|infra/|Better ?Stack|betterstack|PRIO\.md'

if git ls-files -z -- ':!scripts/leak-check.sh' | xargs -0 grep -nE "$pattern"; then
  echo "::error::A file names something private to the platform repo (pattern: $pattern)."
  exit 1
fi
