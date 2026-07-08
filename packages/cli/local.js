#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chdir, cwd } from "node:process";

const entrypointPath = fileURLToPath(import.meta.url);
const require = createRequire(import.meta.url);
const packageRoot = dirname(entrypointPath);
const bootstrappedEntrypoint = join(packageRoot, "local-main.js");
const localTsconfigPath = join(packageRoot, "tsconfig.local.json");
const shellCwd = process.env.PWD;

if (
  shellCwd !== undefined &&
  resolve(cwd()) === resolve(packageRoot) &&
  resolve(shellCwd) !== resolve(packageRoot)
) {
  chdir(shellCwd);
}

if (process.env.WEBSTUDIO_LOCAL_CLI_BOOTSTRAPPED !== "1") {
  const conditionsArg = "--conditions=webstudio";
  const hasWebstudioCondition = process.execArgv.some(
    (arg, index, args) =>
      arg === conditionsArg ||
      (arg === "--conditions" && args[index + 1] === "webstudio")
  );
  const hasTsxImport = process.execArgv.some(
    (arg, index, args) =>
      arg === "--import=tsx" ||
      (arg.startsWith("--import=") && arg.includes("tsx")) ||
      (arg === "--import" && args[index + 1]?.includes("tsx"))
  );
  const execArgv = [
    ...process.execArgv,
    ...(hasWebstudioCondition ? [] : [conditionsArg]),
    ...(hasTsxImport
      ? []
      : [`--import=${pathToFileURL(require.resolve("tsx")).href}`]),
  ];
  const result = spawnSync(
    process.execPath,
    [...execArgv, bootstrappedEntrypoint, ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: process.env.TSX_TSCONFIG_PATH ?? localTsconfigPath,
        WEBSTUDIO_LOCAL_CLI_BOOTSTRAPPED: "1",
      },
    }
  );

  if (result.signal !== null) {
    process.kill(process.pid, result.signal);
  }
  process.exit(result.status ?? 1);
}

throw Error("packages/cli/local.js must bootstrap through local-main.js");
