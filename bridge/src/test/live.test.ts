import * as assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Runs against a real TDB server when TDB_TEST_URL and TDB_TEST_KEY are set
// (CI starts the community image); skipped otherwise.
const url = process.env.TDB_TEST_URL;
const key = process.env.TDB_TEST_KEY;
const BRIDGE = fileURLToPath(new URL("../../dist/bridge.cjs", import.meta.url));

test("a real TDB server answers query_source through the bridge", { skip: !url || !key }, async () => {
  const client = new Client({ name: "bridge-live-test", version: "0" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [BRIDGE],
      env: { TDB_URL: url!, TDB_API_KEY: key!, PATH: process.env.PATH ?? "" },
    }),
  );
  const { tools } = await client.listTools();
  assert.ok(tools.some((t) => t.name === "query_source"), JSON.stringify(tools.map((t) => t.name)));
  const result = await client.callTool({ name: "query_source", arguments: { sql: "SELECT count(*) AS n FROM data" } });
  assert.notEqual(result.isError, true, JSON.stringify(result.content));
  assert.match(JSON.stringify(result.content), /\\"n\\":\s*2/);
  await client.close();
});
