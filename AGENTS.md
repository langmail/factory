# Langmail factory

The skills, workflow and review rules that every Langmail software repo shares. The repos that take them are listed in `factory.json` (`consumers`); why this repo exists and the decisions behind it: https://github.com/langmail/platform/issues/1425 (private).

## How a change reaches the repos

- Skills of our own live in `skills/<name>/`. A third-party skill is pinned by commit in `factory.json`: change it upstream, then move its `ref`.
- A merge to `main` changes nothing downstream. A tag `vX.Y.Z` on `main` starts `.github/workflows/sync.yml`, which opens a sync PR in each consumer that merges itself once its CI is green. So the PR here is the only review a change gets: review it for every consumer.
- Consumers install the skills with the `skills` CLI into `.agents/skills/<name>/` with a `.claude/skills/<name>` symlink, pinned in their `skills-lock.json`. Their CI calls `.github/workflows/skills-check.yml`, which fails on any hand edit to a copy.
- A skill a consumer no longer gets goes to `retired` in `factory.json`, so the next sync removes it.

## Rules

- This repo is public, and so are four of its consumers. Nothing here may name what is private to `langmail/platform`; `scripts/leak-check.sh` checks the obvious cases. A fact about one repo goes in that repo's `AGENTS.md`, under `## Factory`.
- Keep skills thin: state only what a model cannot know or infer about our repos and tools.
- Commits follow conventional commits, and changes go through pull requests.
