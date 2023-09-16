import { argv, exit } from "node:process";
import { parseArgs } from "node:util";
import { generateStories } from "./generate-stories";

const { positionals } = parseArgs({
  args: argv.slice(2),
  allowPositionals: true,
});

const [command] = positionals;

if (command === "generate-stories") {
  await generateStories();
  exit(0);
}

throw Error(`Unknown command ${command}`);
