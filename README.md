# TDB connectors

One-step setup of [The Data-Bridge (TDB)](https://docs.tdb.jiracorp.co.in) for AI tools
beyond VS Code. TDB turns your databases and CSVs into governed, audited, read-only SQL
that AI agents reach over MCP.

> **In development.** Nothing here is released yet. Until it is, connect by hand as
> described in [IDE setup](https://docs.tdb.jiracorp.co.in/getting-started/ide-setup/).
> For VS Code, use the [TDB extension](https://marketplace.visualstudio.com/items?itemName=tdb-project.tdb-vscode).

| Folder | What it is | Status |
|---|---|---|
| `bridge/` | A small local MCP server that forwards to your TDB server over HTTP, adding your API key | Built and tested |
| `claude-code/` | A Claude Code plugin: asks for your server URL and key, keeps the key out of settings | Built and tested |
| `claude-desktop/` | A Claude Desktop extension (`.mcpb`) built on the bridge | Built and tested |

Your API key is kept in your system's secure credential store (the macOS Keychain; on
Linux, a file readable only by you) and sent only to the TDB server you configure. The connectors collect no telemetry. TDB's audit log records
each call with the AI client that made it.

## License

MIT. TDB Community is AGPLv3; TDB Enterprise is commercial.
