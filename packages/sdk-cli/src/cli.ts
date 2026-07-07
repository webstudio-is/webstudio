import { parseArgs } from "node:util";
import { validateRegistry } from "./validate-registry";

export const runCli = async (args: string[]) => {
  const { positionals } = parseArgs({
    args,
    allowPositionals: true,
  });

  const [command, registry] = positionals;

  if (command === "generate-stories") {
    throw Error(
      "generate-stories must be run from a package-local static entrypoint such as tsx src/generate-stories.ts"
    );
    return;
  }

  if (command === "validate-registry") {
    await validateRegistry(registry);
    return;
  }

  throw Error(`Unknown command ${command}`);
};
