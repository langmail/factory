#!/usr/bin/env node
// Brings one consumer repo to a factory version: installs every shared skill
// from factory.json at its pin, removes retired skills, and points the repo's
// calls to this repo's reusable workflows at the same version.
//
// Usage: node scripts/sync.mjs <consumer repo dir> <factory tag>

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS_CLI = "skills@1.9.0";

const [target, version] = process.argv.slice(2);
if (!target || !version) {
  console.error("Usage: node scripts/sync.mjs <consumer repo dir> <factory tag>");
  process.exit(2);
}

const factory = JSON.parse(readFileSync(new URL("../factory.json", import.meta.url), "utf8"));
const skills = (...args) =>
  execFileSync("npx", ["--yes", SKILLS_CLI, ...args], { cwd: target, stdio: "inherit" });

// A skill without a source lives in this repo and is pinned to the release.
for (const [name, { source = "langmail/factory", ref = version }] of Object.entries(factory.skills)) {
  skills("add", `${source}#${ref}`, "--skill", name, "--agent", "claude-code", "--yes");
}

const lockPath = join(target, "skills-lock.json");
const installed = Object.keys(JSON.parse(readFileSync(lockPath, "utf8")).skills);
const retired = factory.retired.filter((name) => installed.includes(name));
if (retired.length > 0) skills("remove", ...retired, "--yes");

const workflows = join(target, ".github", "workflows");
const call = /(langmail\/factory\/\.github\/workflows\/[\w.-]+\.ya?ml)@[\w.-]+/g;
for (const file of existsSync(workflows) ? readdirSync(workflows) : []) {
  const path = join(workflows, file);
  const before = readFileSync(path, "utf8");
  const after = before.replace(call, `$1@${version}`);
  if (after !== before) writeFileSync(path, after);
}
