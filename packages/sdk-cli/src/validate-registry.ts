import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);

export const validateRegistry = async (
  registry = "src/__generated__/registry/registry.json",
  { stdio = "inherit" }: { stdio?: "inherit" | "ignore" } = {}
) => {
  const shadcnBinPath = require.resolve("shadcn");
  const { NODE_OPTIONS: _nodeOptions, ...env } = process.env;
  const registryPath = resolve(registry);
  const registryFile = basename(registryPath);
  const child = spawn(
    process.execPath,
    [shadcnBinPath, "registry", "validate", registryFile],
    {
      cwd: dirname(registryPath),
      env,
      stdio,
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
