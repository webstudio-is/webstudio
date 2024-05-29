import { parseArgs } from "node:util";

export const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    dev: {
      type: "boolean",
    },
  },
});
