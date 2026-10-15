#!/usr/bin/env sh
# Packs claude-desktop/ into dist/tdb.mcpb with the tested bridge bundle inside.
# Run from the repo root after `npm run build` in bridge/.
set -eu
mkdir -p claude-desktop/server dist
cp bridge/dist/bridge.cjs claude-desktop/server/bridge.cjs
npx --yes @anthropic-ai/mcpb@2.1.2 validate claude-desktop/manifest.json
npx --yes @anthropic-ai/mcpb@2.1.2 pack claude-desktop dist/tdb.mcpb
