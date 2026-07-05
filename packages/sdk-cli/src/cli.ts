import { parseArgs } from "node:util";
import { generateStories } from "./generate-stories";
import { validateRegistry } from "./validate-registry";

export const runCli = async (args: string[]) => {
  const { positionals } = parseArgs({
    args,
    allowPositionals: true,
  });

  const [command, registry] = positionals;

  if (command === "generate-stories") {
    await generateStories();
    return;
  }

  if (command === "validate-registry") {
    await validateRegistry(registry);
    return;
  }

  throw Error(`Unknown command ${command}`);
};
