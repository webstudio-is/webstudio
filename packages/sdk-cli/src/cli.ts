import { parseArgs } from "node:util";
import { generateRegistry } from "./generate-registry";
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

  if (command === "generate-registry") {
    await generateRegistry();
    return;
  }

  if (command === "validate-registry") {
    await validateRegistry(registry);
    return;
  }

  throw Error(`Unknown command ${command}`);
};
