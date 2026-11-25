#!/usr/bin/env node
// Brings a consumer repo to a release: copies the skills install.mjs
// installed, with their skills-lock.json entries and .claude/skills symlinks,
// removes retired skills, copies labels.yml to .github/labels.yml, and pins
// the repo's calls to this repo's reusable workflows to the release commit. Node built-ins only, because it runs in
// the job that holds the sync App's token.
//
// Usage: node scripts/apply.mjs <installed dir> <consumer dir> <tag> <commit>

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [installed, target, tag, commit] = process.argv.slice(2);
if (!installed || !target || !/^v\d+\.\d+\.\d+$/.test(tag ?? "") || !/^[0-9a-f]{40}$/.test(commit ?? "")) {
  console.error("Usage: node scripts/apply.mjs <installed dir> <consumer dir> <vX.Y.Z> <40-character commit>");
  process.exit(2);
}

const { retired } = JSON.parse(readFileSync(new URL("../factory.json", import.meta.url), "utf8"));
const readLock = (dir) => {
  const path = join(dir, "skills-lock.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { version: 2, skills: {} };
};
const source = readLock(installed);
const lock = readLock(target);
lock.version = source.version;

const unlink = (name) => {
  rmSync(join(target, ".agents", "skills", name), { recursive: true, force: true });
  rmSync(join(target, ".claude", "skills", name), { recursive: true, force: true });
  delete lock.skills[name];
};

for (const name of retired) unlink(name);
mkdirSync(join(target, ".claude", "skills"), { recursive: true });
for (const name of Object.keys(source.skills)) {
  unlink(name);
  cpSync(join(installed, ".agents", "skills", name), join(target, ".agents", "skills", name), { recursive: true });
  symlinkSync(`../../.agents/skills/${name}`, join(target, ".claude", "skills", name));
  lock.skills[name] = source.skills[name];
}

lock.skills = Object.fromEntries(Object.entries(lock.skills).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(target, "skills-lock.json"), `${JSON.stringify(lock, null, 2)}\n`);

mkdirSync(join(target, ".github"), { recursive: true });
cpSync(new URL("../labels.yml", import.meta.url), join(target, ".github", "labels.yml"));

const workflows = join(target, ".github", "workflows");
const call = /(langmail\/factory\/\.github\/workflows\/[\w.-]+\.ya?ml)@\S+( # \S+)?/g;
for (const file of existsSync(workflows) ? readdirSync(workflows) : []) {
  const path = join(workflows, file);
  const before = readFileSync(path, "utf8");
  const after = before.replace(call, `$1@${commit} # ${tag}`);
  if (after !== before) writeFileSync(path, after);
}
