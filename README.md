# factory

The agent skills, workflow and review rules shared by [Langmail](https://langmail.me)'s software repositories, such as [caldav-mcp](https://github.com/langmail/caldav-mcp), [carddav-mcp](https://github.com/langmail/carddav-mcp), [imap-mcp](https://github.com/langmail/imap-mcp) and [langmail-mcp](https://github.com/langmail/langmail-mcp).

Each repository commits pinned copies of the skills, installed with the [`skills` CLI](https://github.com/vercel-labs/skills), so they load in local, cloud and CI sessions alike. A release tag here opens a pull request in every repository that brings it to the new version.

The repositories also share the issue labels in [`labels.yml`](labels.yml) and call the reusable workflows in [`.github/workflows/`](.github/workflows) for Claude reviews, `@claude` requests, issue triage and label sync.

The shared skills live in [`skills/`](skills). Third-party ones keep their upstream license, and [`factory.json`](factory.json) records the upstream commit each was copied from.

## License

MIT
