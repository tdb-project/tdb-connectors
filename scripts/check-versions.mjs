// The plugin, the Desktop extension and the bridge ship together, so their
// versions must agree, and on a release tag they must equal the tag.
import { readFileSync } from "node:fs";

const json = (p) => JSON.parse(readFileSync(p, "utf8"));
const found = {
  "claude-code/.claude-plugin/plugin.json": json("claude-code/.claude-plugin/plugin.json").version,
  "claude-desktop/manifest.json": json("claude-desktop/manifest.json").version,
  "bridge/package.json": json("bridge/package.json").version,
  "bridge/src/bridge.ts VERSION": readFileSync("bridge/src/bridge.ts", "utf8").match(/const VERSION = "([^"]+)"/)?.[1],
};
const tag = process.env.GITHUB_REF_TYPE === "tag" ? process.env.GITHUB_REF_NAME : undefined;
if (tag) found[`tag ${tag}`] = tag.replace(/^v/, "");

const versions = new Set(Object.values(found));
for (const [where, v] of Object.entries(found)) console.log(`${v ?? "MISSING"}  ${where}`);
if (versions.size !== 1 || versions.has(undefined)) {
  console.error("Versions disagree.");
  process.exit(1);
}
