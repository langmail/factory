#!/usr/bin/env node
// Installs every skill in skills/ at one commit of this repo into an empty
// directory with the skills CLI, which writes the pinned skills-lock.json
// entries. Runs third-party npm code, so never in a job that holds a secret.
//
// Usage: node scripts/install.mjs <empty dir> <commit>

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const [target, commit] = process.argv.slice(2);
if (!target || !/^[0-9a-f]{40}$/.test(commit ?? "")) {
  console.error("Usage: node scripts/install.mjs <empty dir> <40-character commit>");
  process.exit(2);
}

mkdirSync(target, { recursive: true });
execFileSync("git", ["init", "--quiet"], { cwd: target });
// Naming Codex as well makes the CLI install into .agents/skills with a
// .claude/skills symlink; for Claude Code alone it copies into .claude/skills.
execFileSync(
  "npx",
  ["--yes", "skills@1.9.0", "add", `langmail/factory#${commit}`, "--skill", "*",
    "--agent", "claude-code", "--agent", "codex", "--yes"],
  { cwd: target, stdio: "inherit" },
);
