#!/usr/bin/env node

import { createRequire } from "node:module";
import semver from "semver";

const require = createRequire(import.meta.url);
const packageJson = require("./package.json");

const start = async () => {
  const currentVersion = process.versions.node;
  const supportedVersionRange = packageJson.engines.node;
  if (semver.satisfies(currentVersion, supportedVersionRange) === false) {
    console.error(
      `Webstudio CLI requires Node.js ${supportedVersionRange}. Detected Node.js ${currentVersion}. Install a supported Node.js version and try again.`
    );
    process.exitCode = 1;
    return;
  }

  const { main } = await import("./lib/cli.js");
  await main();
};

await start();
