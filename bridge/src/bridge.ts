import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js";

const VERSION = "0.1.0";

// stdout carries the MCP protocol, so every human-readable line goes to stderr.
function log(message: string): void {
  process.stderr.write(`tdb-bridge: ${message}\n`);
}

// Turns whatever the SDK threw into one sentence a person can act on. The API key
// is never part of the result: only the URL and TDB's own words are.
function explain(err: unknown, url: string): string {
  const text = err instanceof Error ? `${err.message} ${(err as { cause?: unknown }).cause ?? ""}` : String(err);
  const code = (err as { code?: unknown })?.code;
  if (/license_expired/.test(text)) {
    return "the TDB Enterprise licence has expired (HTTP 403); renew it on the server";
  }
  if (code === 401 || code === -32001 || /invalid or missing API key|Unauthorized/i.test(text)) {
    return "TDB rejected the API key; check the key in the extension settings";
  }
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|fetch failed/i.test(text)) {
    return `cannot reach TDB at ${url}; check the server URL and that TDB is running`;
  }
  return text.trim();
}

async function main(): Promise<void> {
  const url = (process.env.TDB_URL ?? "").trim().replace(/\/+$/, "");
  const key = (process.env.TDB_API_KEY ?? "").trim();
  if (!/^https?:\/\/[^\s/]+/.test(url)) {
    log("TDB_URL must be an http:// or https:// URL, for example http://localhost:8000");
    process.exit(1);
  }
  if (!key) {
    log("TDB_API_KEY is not set");
    process.exit(1);
  }

  const server = new Server({ name: "tdb-bridge", version: VERSION }, { capabilities: { tools: { listChanged: false } } });

  // TDB's audit log names the client from the User-Agent on handshake-era calls,
  // so the bridge connects only once the app in front of it has said who it is,
  // and passes that on: "<app name>/<app version> (via tdb-bridge/0.1.0)". Claude Desktop
  // on Windows reports "local-agent-mode-The Data-Bridge (TDB)/1.0.0", not its own name.
  let upstream: Promise<Client> | undefined;
  const connectUpstream = async (): Promise<Client> => {
    const app = server.getClientVersion();
    const userAgent = `${app ? `${app.name}/${app.version} ` : ""}(via tdb-bridge/${VERSION})`;
    const client = new Client({ name: "tdb-bridge", version: VERSION });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${url}/v1/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${key}`, "User-Agent": userAgent } },
      }),
    );
    log(`connected to ${url}`);
    return client;
  };
  const tdb = (): Promise<Client> =>
    (upstream ??= connectUpstream().catch((err) => {
      log(explain(err, url));
      process.exit(1);
    }));
  server.oninitialized = () => void tdb();

  const relay = async <T>(call: (client: Client) => Promise<T>): Promise<T> => {
    try {
      return await call(await tdb());
    } catch (err) {
      const message = explain(err, url);
      log(message);
      throw new McpError(err instanceof McpError ? err.code : ErrorCode.InternalError, message);
    }
  };
  server.setRequestHandler(ListToolsRequestSchema, (req) => relay((c) => c.listTools(req.params)));
  server.setRequestHandler(CallToolRequestSchema, (req) => relay((c) => c.callTool(req.params)));
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  log(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
