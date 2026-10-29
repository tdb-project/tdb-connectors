# TDB connectors

One-step setup of [The Data-Bridge (TDB)](https://docs.tdb.jiracorp.co.in) for AI tools
beyond VS Code. TDB turns your databases and CSVs into governed, audited, read-only SQL
that AI agents reach over MCP.

## Install

You need a running TDB server and an API key for it. Start one with the
[quickstart](https://docs.tdb.jiracorp.co.in/getting-started/quickstart/).

**Claude Code** 2.1.292 or later, in a terminal:

```
claude plugin install tdb --marketplace tdb-project/tdb-connectors
```

On earlier versions, add the marketplace first:

```
claude plugin marketplace add tdb-project/tdb-connectors
claude plugin install tdb@tdb-connectors
```

Then, in Claude Code, run `/plugin configure tdb@tdb-connectors` to enter your TDB server URL
and API key, and `/reload-plugins` to connect. Run `/mcp` to check that `tdb` is connected.

**Claude Desktop:** download `tdb.mcpb` from the
[latest release](https://github.com/tdb-project/tdb-connectors/releases/latest) and open it
to install. Then enter your server URL and API key in Settings → Extensions → The Data-Bridge
(TDB).

**VS Code:** use the [TDB extension](https://marketplace.visualstudio.com/items?itemName=tdb-project.tdb-vscode).
For any other MCP client, connect by hand as described in
[IDE setup](https://docs.tdb.jiracorp.co.in/getting-started/ide-setup/).

## Smaller results for the agent

TDB is lean by design: [Lean Mode](https://docs.tdb.jiracorp.co.in/api/mcp/#saving-tokens-lean-mode)
sends rows as arrays and can trim long text with a marker, about a third fewer tokens on
a 100-row answer. The connectors have no setting for it, because it is set on the TDB
server: ask for it in the prompt (*"use lean: true"*), set it on your API key
(enterprise), or turn it on for everyone with `TDB_LEAN_MODE=on`. Claude Code and Claude
Desktop pass the result to the model once, so the tokens aren't spent twice.

## What is here

| Folder | What it is |
|---|---|
| `bridge/` | A small local MCP server that forwards to your TDB server over HTTP, adding your API key |
| `claude-code/` | A Claude Code plugin: asks for your server URL and key, keeps the key out of settings |
| `claude-desktop/` | A Claude Desktop extension (`.mcpb`) built on the bridge |

Your API key is kept in your system's secure credential store (the macOS Keychain; on
Linux, a file readable only by you) and sent only to the TDB server you configure. The connectors collect no telemetry. TDB's audit log records
each call with the AI client that made it.

## License

MIT. TDB Community is AGPLv3; TDB Enterprise is commercial.
