// Checks the shared labels and the reusable workflows that every consumer
// calls. Run with `node --test scripts/*.test.mjs`.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const unquote = (value) => value.trim().replace(/^"(.*)"$/, "$1");

const [labelsPart, retiredPart] = read("labels.yml").split(/^retired:$/m);
const labels = [...labelsPart.matchAll(/^ {2}- name: (.+)\n {4}color: (.+)$/gm)].map(([, name, color]) => ({
  name: unquote(name),
  color: unquote(color),
}));
const retired = [...retiredPart.matchAll(/^ {2}- name: (.+)$/gm)].map(([, name]) => unquote(name));
const names = labels.map((label) => label.name);

test("labels have unique names and six-digit hex colours, and none is also retired", () => {
  assert.ok(labels.length > 0);
  assert.equal(new Set(names).size, names.length);
  for (const { color } of labels) assert.match(color, /^[0-9a-f]{6}$/);
  for (const name of retired) assert.ok(!names.includes(name), `${name} is both a label and retired`);
});

const triage = read(".github/workflows/triage-on-comment.yml");

test("triage-on-comment filters on labels that exist", () => {
  const used = [...triage.matchAll(/labels\.\*\.name, '([^']+)'/g)].map(([, name]) => name);
  assert.ok(used.length > 0);
  for (const name of used) assert.ok(names.includes(name), `${name} is not in labels.yml`);
});

// Issue text must not reach a shell: Bash and both token paths are denied,
// and nothing but reads of the checkout and the sibling clone and the GitHub
// MCP tools the prompt names is allowed. Both flags accumulate at runtime, so
// every occurrence counts. Subagents are denied too: the triage skill leaves
// a design pass to the scheduled run.
test("triage-on-comment denies Bash and allows only reads and GitHub MCP tools", () => {
  const rules = (flag) =>
    [...triage.matchAll(new RegExp(`--${flag} "([^"]+)"`, "g"))].flatMap(([, list]) => list.split(","));
  const denied = rules("disallowed-tools");
  for (const rule of ["Bash", "Agent", "Task", "Read(./.git/**)", "Read(//proc/**)"]) {
    assert.ok(denied.includes(rule), `${rule} is not denied`);
  }
  assert.deepEqual(rules("allowed-tools"), [
    "Read(./**)${{ steps.sibling.outputs.read }}",
    "mcp__github__get_issue",
    "mcp__github__get_issue_comments",
    "mcp__github__list_issues",
    "mcp__github__search_issues",
    "mcp__github__list_sub_issues",
    "mcp__github__list_issue_types",
    "mcp__github__get_pull_request",
    "mcp__github__list_pull_requests",
    "mcp__github__search_pull_requests",
    "mcp__github__add_issue_comment",
    "mcp__github__update_issue",
  ]);
  assert.match(triage, /echo "read=,Read\(\/\$target\/\*\*\)"/);
});

// Consumers run these workflows with their own secrets, so an action may move
// only when a factory PR moves it. claude-code-action is the exception: its
// releases bring the Claude Code version that newer models need.
test("every action is pinned by commit", () => {
  for (const file of readdirSync(new URL("../.github/workflows/", import.meta.url))) {
    for (const [, action] of read(`.github/workflows/${file}`).matchAll(/^\s+(?:- )?uses: (\S+)/gm)) {
      if (action === "anthropics/claude-code-action@v1") continue;
      assert.match(action, /@[0-9a-f]{40}$/, `${file}: ${action}`);
    }
  }
});
