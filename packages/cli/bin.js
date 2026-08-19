#!/usr/bin/env node

import { createRequire } from "node:module";
import { runWithSupportedNode } from "./node-version.js";

const require = createRequire(import.meta.url);
const packageJson = require("./package.json");

const started = await runWithSupportedNode({
  currentVersion: process.versions.node,
  supportedVersionRange: packageJson.engines.node,
  reportError: console.error,
  run: async () => {
    const { main } = await import("./lib/cli.js");
    await main();
  },
});

if (started === false) {
  process.exitCode = 1;
}
