#!/usr/bin/env tsx --conditions=webstudio --experimental-import-meta-resolve
import { argv, exit } from "node:process";
import { runCli } from "./cli";

await runCli(argv.slice(2));
exit(process.exitCode ?? 0);
