#!/usr/bin/env node --experimental-specifier-resolution=node --no-warnings
// pnpm tsx --no-warnings ./src/bin.ts
import { main } from "./cli";

await main();
