# factory

The agent skills, workflow and review rules shared by [Langmail](https://langmail.me)'s software repositories, such as [caldav-mcp](https://github.com/langmail/caldav-mcp), [carddav-mcp](https://github.com/langmail/carddav-mcp), [imap-mcp](https://github.com/langmail/imap-mcp) and [langmail-mcp](https://github.com/langmail/langmail-mcp).

Each repository commits pinned copies of the skills, installed with the [`skills` CLI](https://github.com/vercel-labs/skills), so they load in local, cloud and CI sessions alike. A release tag here opens a pull request in every repository that brings it to the new version.

The shared skills and where each comes from are listed in [`factory.json`](factory.json); skills without a source live in [`skills/`](skills).

## License

MIT
