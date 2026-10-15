import * as http from "node:http";
import type { AddressInfo } from "node:net";

export type Mode = "ok" | "bad-key" | "expired";
export type Seen = { method: string | undefined; headers: http.IncomingHttpHeaders };

// Answers just enough MCP, the way TDB does, for the bridge's SDK client to
// connect, and records every request so tests can check what the bridge sent.
export async function startFakeTdb(mode: Mode): Promise<{ url: string; seen: Seen[]; close(): void }> {
  const seen: Seen[] = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const json = (status: number, payload?: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(payload === undefined ? undefined : JSON.stringify(payload));
      };
      if (req.method !== "POST") {
        return json(405);
      }
      const msg = JSON.parse(body) as { id?: number; method?: string; params?: { name?: string } };
      seen.push({ method: msg.method, headers: req.headers });
      if (mode === "expired") {
        return json(403, { error: "license_expired", reason: "expired", detail: "The TDB Enterprise license has expired." });
      }
      if (msg.id === undefined) {
        return json(202);
      }
      const reply = (result: unknown) => json(200, { jsonrpc: "2.0", id: msg.id, result });
      if (msg.method === "initialize") {
        return reply({ protocolVersion: "2025-11-25", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "fake-tdb", version: "0" } });
      }
      if (mode === "bad-key") {
        return json(200, { jsonrpc: "2.0", id: msg.id, error: { code: -32001, message: "Unauthorized: invalid or missing API key" } });
      }
      if (msg.method === "tools/list") {
        return reply({
          tools: [
            {
              name: "query_source",
              description: "Run read-only SQL",
              inputSchema: { type: "object", properties: { sql: { type: "string" } }, required: ["sql"] },
              outputSchema: { type: "object", properties: { n: { type: "number" } }, required: ["n"] },
              annotations: { readOnlyHint: true },
            },
            { name: "preview_source", description: "Preview rows", inputSchema: { type: "object" } },
          ],
        });
      }
      if (msg.method === "tools/call" && msg.params?.name === "query_source") {
        return reply({ content: [{ type: "text", text: '{"n": 2}' }], structuredContent: { n: 2 } });
      }
      if (msg.method === "tools/call") {
        return reply({ content: [{ type: "text", text: "Tool 'preview_source' is not permitted for this API key." }], isError: true });
      }
      json(200, { jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    seen,
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
}
