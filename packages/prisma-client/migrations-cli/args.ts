import { parseArgs } from "node:util";

export const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    cwd: {
      type: "string",
      default: "./",
    },
    dev: {
      type: "boolean",
    },
  },
});
