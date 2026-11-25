// Checks the shared labels, WORKFLOW.md and the reusable workflows that every consumer
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

const workflow = read("WORKFLOW.md");

test("WORKFLOW.md documents every label and names no other", () => {
  for (const name of names) assert.ok(workflow.includes(`\`${name}\``), `${name} is not in WORKFLOW.md`);
  for (const [, name] of workflow.matchAll(/`((?:needs|ready)-[a-z-]+|urgent)`/g)) {
    assert.ok(names.includes(name), `WORKFLOW.md names ${name}, which is not in labels.yml`);
  }
  for (const name of retired) assert.ok(!workflow.includes(`\`${name}\``), `WORKFLOW.md names retired ${name}`);
});

// skills-check.yml reads the entries from this list and fails a consumer
// whose AGENTS.md lacks one, so every entry the workflow refers to is listed.
test("every Factory section entry WORKFLOW.md refers to is in its list", () => {
  const [, after] = workflow.split(/^## The Factory section$/m);
  const [list] = after.split(/^## /m);
  const listed = [...list.matchAll(/^- \*\*([^*]+):\*\*/gm)].map(([, name]) => name);
  assert.ok(listed.length > 0);
  for (const [, name] of workflow.matchAll(/Factory section's\s+\*\*([^*]+)\*\*/g)) {
    assert.ok(listed.includes(name), `${name} is not in the Factory section list`);
  }
});

// Cloud sessions refuse GitHub GraphQL, which gh issue, gh pr and gh search
// go through, so the workflow writes every GitHub step as a gh api REST call.
test("WORKFLOW.md names no gh issue, gh pr, gh search or GraphQL command", () => {
  const refused =
    /\bgh(?:\s+-{1,2}[\w-]+(?:[\s=][^\s-]\S*)?)*\s+(?:(?:issue|pr)\s+\w+|search\s+\w+|api\s+graphql)\b/g;
  assert.deepEqual(workflow.match(refused) ?? [], []);
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
  // In the action's default auto mode the allow list is not strict.
  assert.match(triage, /--permission-mode acceptEdits/);
});

// PR comments from anyone reach the review's prompt, so it may not change the
// branch or read the tokens, its allow list must be strict, and it may only
// read through the GitHub MCP server and comment inline.
test("the review can't write, push or read the tokens", () => {
  const review = read(".github/workflows/review.yml");
  assert.match(review, /--permission-mode acceptEdits/);
  const denied = [...review.matchAll(/--disallowed-tools "([^"]+)"/g)].flatMap(([, list]) => list.split(","));
  // Bash outright: a consumer's .claude/settings.json may allow all of it.
  for (const rule of ["Bash", "Edit", "Write", "Read(./.git/**)", "Read(//proc/**)"]) {
    assert.ok(denied.includes(rule), `${rule} is not denied`);
  }
  const allowed = [...review.matchAll(/--allowed-tools "([^"]+)"/g)].flatMap(([, list]) => list.split(","));
  for (const tool of allowed) {
    assert.match(tool, /^mcp__github(_inline_comment__create_inline_comment|__(get|search)_\w+)$/, tool);
  }
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
