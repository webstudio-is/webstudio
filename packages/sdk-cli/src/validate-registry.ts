import { spawn } from "node:child_process";

export const validateRegistry = async (
  registry = "src/__generated__/registry.json"
) => {
  const command = process.platform === "win32" ? "shadcn.cmd" : "shadcn";
  const child = spawn(command, ["registry", "validate", registry], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
};
