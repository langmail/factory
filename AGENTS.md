# Langmail factory

The skills, workflow and review rules that every Langmail software repo shares. The repos that take them are listed in `factory.json` (`consumers`).

## How a change reaches the repos

- Every shared skill lives in `skills/<name>/`, our own and third-party ones alike, so the PR here shows the text every repo will run. A third-party skill keeps its upstream `LICENSE`, and `factory.json` (`upstream`) records the commit it was copied from: to update it, copy the newer upstream folder in.
- A merge to `main` changes nothing downstream. A tag `vX.Y.Z` on `main` starts `.github/workflows/sync.yml`, which opens a PR in each consumer and merges it once all its checks are green, with no further review. So the PR here is the only review a change gets: review it for every consumer.
- Consumers get the skills in `.agents/skills/<name>/`, with a `.claude/skills/<name>` symlink, pinned by commit in their `skills-lock.json`. Their CI calls `.github/workflows/skills-check.yml`, which fails on any hand edit to a copy.
- A skill a consumer should lose goes to `retired` in `factory.json`, and the next sync removes it.
- We copy skills into each repo, and use no Claude Code plugin, because cloud sessions and routines load only what is committed in the repo they clone.

## Rules

- This repo is public, and so are four of its consumers. Nothing here may name what is private to Langmail's platform repo; `scripts/leak-check.sh` checks the obvious cases. A fact about one repo goes in that repo's `AGENTS.md`, under `## Factory`.
- The sync job holds a token that can write to every consumer. Code it runs comes only from this repo and from actions pinned by commit; third-party npm code (the skills CLI) runs only in jobs without secrets.
- Keep skills thin: state only what a model cannot know or infer about our repos and tools.
- Commits follow conventional commits, and changes go through pull requests.
