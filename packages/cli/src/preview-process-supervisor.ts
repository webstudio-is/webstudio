import { spawn, type ChildProcess } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import fkill from "fkill";

type PreviewProcessConfig = {
  command: string;
  args: string[];
  cwd?: string;
  ownerFile?: string;
};

const terminationTimeoutMs = 2_000;

const waitForExit = (child: ChildProcess, timeoutMs: number) =>
  new Promise<boolean>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve(true);
      return;
    }
    const timeout = setTimeout(() => resolve(false), timeoutMs);
    timeout.unref();
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });

const signalOwnedProcessTree = async (
  child: ChildProcess,
  signal: NodeJS.Signals
) => {
  if (child.pid === undefined) {
    return;
  }
  if (process.platform === "win32") {
    await fkill(child.pid, {
      force: true,
      tree: true,
      waitForExit: terminationTimeoutMs,
      silent: true,
    });
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") {
      return;
    }
    throw error;
  }
};

export const stopOwnedPreviewProcessTree = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  await signalOwnedProcessTree(child, "SIGTERM");
  if (await waitForExit(child, terminationTimeoutMs)) {
    return;
  }
  await signalOwnedProcessTree(child, "SIGKILL");
  await waitForExit(child, terminationTimeoutMs);
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
  const child = spawn(config.command, config.args, {
    cwd: config.cwd,
    env: process.env,
    stdio: "inherit",
    detached: process.platform !== "win32",
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
    stopping ??= stopOwnedPreviewProcessTree(child)
      .then(clearOwnerFile)
      .finally(() => {
        process.exitCode = 0;
        if (process.connected) {
          process.disconnect();
        }
      });
    return stopping;
  };
  process.once("disconnect", () => void stop());
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
  child.once("error", (error) => {
    console.error(`Could not start the generated preview process: ${error}`);
    process.exitCode = 1;
    void clearOwnerFile().finally(() => {
      if (process.connected) {
        process.disconnect();
      }
    });
  });
  child.once("exit", (code, signal) => {
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
