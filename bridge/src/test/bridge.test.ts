import * as assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { startFakeTdb, type Mode } from "./fake-tdb.js";

const BRIDGE = fileURLToPath(new URL("../../dist/bridge.cjs", import.meta.url));
const KEY = "k-secret-123";

// Closed after every test, pass or fail: a bridge left running would keep the
// test runner waiting forever on its child process.
const open: Client[] = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((c) => c.close().catch(() => undefined)));
});

// Starts the real bundled bridge, as Claude Desktop does, and connects the
// official SDK client to it over stdio. Everything the bridge says on stderr
// is collected, so tests can check the message and that the key never leaks.
async function viaBridge(url: string, key = KEY) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [BRIDGE],
    env: { TDB_URL: url, TDB_API_KEY: key, PATH: process.env.PATH ?? "" },
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr?.on("data", (chunk) => (stderr += chunk));
  const client = new Client({ name: "bridge-test", version: "0" });
  open.push(client);
  const connected = client.connect(transport).then(
    () => undefined,
    (err: unknown) => err,
  );
  return { client, connectError: await connected, stderr: () => stderr };
}

async function withFake(mode: Mode, body: (fake: Awaited<ReturnType<typeof startFakeTdb>>) => Promise<void>) {
  const fake = await startFakeTdb(mode);
  try {
    await body(fake);
  } finally {
    fake.close();
  }
}

test("lists and calls TDB's tools, passing structured output and refusals through", () =>
  withFake("ok", async (fake) => {
    const { client, connectError } = await viaBridge(fake.url);
    assert.equal(connectError, undefined);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name), ["query_source", "preview_source"]);
    assert.deepEqual(tools[0].annotations, { readOnlyHint: true });

    const ok = await client.callTool({ name: "query_source", arguments: { sql: "SELECT 2 AS n" } });
    assert.deepEqual(ok.structuredContent, { n: 2 });

    const refused = await client.callTool({ name: "preview_source", arguments: {} });
    assert.equal(refused.isError, true);
    assert.match(JSON.stringify(refused.content), /not permitted for this API key/);
    await client.close();
  }));

test("sends the key, the negotiated protocol version and the app's name, and no Origin", () =>
  withFake("ok", async (fake) => {
    const { client } = await viaBridge(fake.url);
    await client.listTools();
    const list = fake.seen.find((s) => s.method === "tools/list");
    assert.ok(list, `no tools/list reached TDB; saw ${JSON.stringify(fake.seen.map((s) => s.method))}`);
    assert.equal(list.headers.authorization, `Bearer ${KEY}`);
    assert.equal(list.headers["mcp-protocol-version"], "2025-11-25");
    assert.equal(list.headers.origin, undefined);
    assert.equal(list.headers["user-agent"], "bridge-test/0 (via tdb-bridge/0.1.0)");
    await client.close();
  }));

test("a rejected key gives a clear error and never echoes the key", () =>
  withFake("bad-key", async (fake) => {
    const { client, connectError, stderr } = await viaBridge(fake.url);
    assert.equal(connectError, undefined);
    await assert.rejects(client.listTools(), /TDB rejected the API key/);
    assert.match(stderr(), /TDB rejected the API key/);
    assert.doesNotMatch(stderr(), new RegExp(KEY));
    await client.close();
  }));

test("an expired enterprise licence stops the bridge with a clear message", () =>
  withFake("expired", async (fake) => {
    const { client, stderr } = await viaBridge(fake.url);
    await assert.rejects(client.listTools());
    assert.match(stderr(), /licence has expired/);
    assert.doesNotMatch(stderr(), new RegExp(KEY));
  }));

test("an unreachable server stops the bridge with a clear message", async () => {
  const { client, stderr } = await viaBridge("http://127.0.0.1:1");
  await assert.rejects(client.listTools());
  assert.match(stderr(), /cannot reach TDB at http:\/\/127\.0\.0\.1:1/);
});

test("missing configuration is refused before any request", async () => {
  const noUrl = await viaBridge("not-a-url");
  assert.ok(noUrl.connectError);
  assert.match(noUrl.stderr(), /TDB_URL must be an http/);
  const noKey = await viaBridge("http://127.0.0.1:1", "");
  assert.ok(noKey.connectError);
  assert.match(noKey.stderr(), /TDB_API_KEY is not set/);
});
