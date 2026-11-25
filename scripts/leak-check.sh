#!/usr/bin/env bash
# Everything in this repo is public and gets copied into public repos. Fails
# when a shared file names something that belongs only in private
# langmail/platform: its repo, infrastructure, monitoring or priorities.
# Repo-specific facts go in each consumer's AGENTS.md (## Factory) instead.
set -euo pipefail
cd "$(dirname "$0")/.."

pattern='langmail/platform|infra/|Better ?Stack|betterstack|PRIO\.md|[Hh]etzner|db\.langmail\.me'

if grep -rnE "$pattern" skills .github/workflows/skills-check.yml; then
  echo "::error::A shared file names something private to langmail/platform (pattern: $pattern)."
  exit 1
fi
