#!/usr/bin/env tsx
import { parseArgs, type ParseArgsConfig } from "node:util";
import * as path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { parseCss } from "../src/parse-css";

const cliOptions = {
  allowPositionals: true,
  strict: true,
} as const satisfies ParseArgsConfig;

const cliArgs = parseArgs({ args: process.argv.slice(2), ...cliOptions });

if (cliArgs.positionals.length < 2) {
  console.error("Please provide the source and destination paths");
  process.exit(1);
}

const sourcePath = path.resolve(process.cwd(), cliArgs.positionals[0]);
const destinationPath = path.resolve(process.cwd(), cliArgs.positionals[1]);

const css = readFileSync(sourcePath, "utf8");
const parsed = parseCss(css);
writeFileSync(destinationPath, JSON.stringify(parsed, null, 2), "utf8");
console.info("CSS parsed and written to", destinationPath);
