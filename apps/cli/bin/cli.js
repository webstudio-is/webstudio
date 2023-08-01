#!/usr/bin/env node --experimental-specifier-resolution=node
/* eslint-disable-next-line */
import { main } from "../lib/index";

main().then(
  () => {
    process.exit(0);
  },
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
