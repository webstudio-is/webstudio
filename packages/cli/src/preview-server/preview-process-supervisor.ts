import { readFile, rm, writeFile } from "node:fs/promises";
import { execa } from "execa";

type PreviewProcessConfig = {
  command: string;
  args: string[];
  cwd?: string;
  ownerFile?: string;
};

const parseConfig = (): PreviewProcessConfig => {
  const value = process.argv[2];
  if (value === undefined) {
    throw new Error("Preview process supervisor configuration is missing.");
  }
  const config = JSON.parse(value) as Partial<PreviewProcessConfig>;
  if (
    typeof config.command !== "string" ||
    Array.isArray(config.args) === false ||
    config.args.some((value) => typeof value !== "string") ||
    (config.cwd !== undefined && typeof config.cwd !== "string") ||
    (config.ownerFile !== undefined && typeof config.ownerFile !== "string")
  ) {
    throw new Error("Preview process supervisor configuration is invalid.");
  }
  return config as PreviewProcessConfig;
};

const main = async () => {
  const config = parseConfig();
  const child = execa(config.command, config.args, {
    cwd: config.cwd,
    env: process.env,
    stdio: "inherit",
    killDescendants: true,
    reject: false,
  });
  const clearOwnerFile = async () => {
    if (config.ownerFile === undefined) {
      return;
    }
    const owner = await readFile(config.ownerFile, "utf8")
      .then((value) => JSON.parse(value) as { supervisorPid?: unknown })
      .catch(() => undefined);
    if (owner?.supervisorPid === process.pid) {
      await rm(config.ownerFile, { force: true }).catch(() => undefined);
    }
  };
  if (config.ownerFile !== undefined) {
    await writeFile(
      config.ownerFile,
      JSON.stringify({
        supervisorPid: process.pid,
        previewPid: child.pid,
        previewDirectory: config.cwd,
      })
    ).catch(() => undefined);
  }
  let stopping: Promise<void> | undefined;
  const stop = () => {
    stopping ??= (async () => {
      child.kill("SIGKILL");
      await child;
      await clearOwnerFile();
    })().finally(() => {
      process.exitCode = 0;
      if (process.connected) {
        process.disconnect();
      }
    });
    return stopping;
  };
  process.once("disconnect", () => void stop());
  for (const signal of ["SIGHUP", "SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => void stop());
  }
  child.nodeChildProcess.once("error", (error) => {
    console.error(`Could not start the generated preview process: ${error}`);
    process.exitCode = 1;
    void clearOwnerFile().finally(() => {
      if (process.connected) {
        process.disconnect();
      }
    });
  });
  child.nodeChildProcess.once("exit", (code, signal) => {
    if (stopping !== undefined) {
      return;
    }
    if (signal !== null) {
      process.exitCode = 1;
    } else {
      process.exitCode = code ?? 0;
    }
    void clearOwnerFile().finally(() => {
      if (process.connected) {
        process.disconnect();
      }
    });
  });
};

if (process.argv[1] !== undefined) {
  await main();
}
