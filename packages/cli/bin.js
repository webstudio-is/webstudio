#!/usr/bin/env node --experimental-specifier-resolution=node
/* eslint-disable-next-line */
import { main } from "./lib/cli";

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
