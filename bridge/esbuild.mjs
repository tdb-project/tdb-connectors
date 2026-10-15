import { build } from "esbuild";

// One CommonJS file with every dependency inside, so the Claude Desktop bundle
// ships no node_modules and runs on whichever Node the app provides.
await build({
  entryPoints: ["src/bridge.ts"],
  bundle: true,
  outfile: "dist/bridge.cjs",
  format: "cjs",
  platform: "node",
  target: "node20",
  minify: process.argv.includes("--production"),
});
