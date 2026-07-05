import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const validateRegistry = async (
  registry = "src/__generated__/registry.json"
) => {
  const shadcnBinPath = require.resolve("shadcn");
  const { NODE_OPTIONS: _nodeOptions, ...env } = process.env;
  const child = spawn(
    process.execPath,
    [shadcnBinPath, "registry", "validate", registry],
    {
      env,
      stdio: "inherit",
    }
  );
  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
};
