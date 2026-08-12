import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cwd } from "node:process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const sleep = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

const waitFor = async (predicate: () => boolean | Promise<boolean>) => {
  const deadline = Date.now() + 5_000;
  while ((await predicate()) === false) {
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for the preview process state.");
    }
    await sleep(25);
  }
};

const isProcessRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(
      error instanceof Error &&
      "code" in error &&
      error.code === "ESRCH"
    );
  }
};

const stopProcess = (pid: number | undefined) => {
  if (pid === undefined) {
    return;
  }
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // The process already stopped.
  }
};

const getLifecycleTestRoot = async () => {
  if (process.env.WEBSTUDIO_WSL_9P_TEST_ROOT !== undefined) {
    return process.env.WEBSTUDIO_WSL_9P_TEST_ROOT;
  }
  const isWsl = await readFile("/proc/sys/kernel/osrelease", "utf8")
    .then((value) => value.toLowerCase().includes("microsoft"))
    .catch(() => false);
  return isWsl && cwd().startsWith("/mnt/") ? cwd() : tmpdir();
};

type LifecycleCase = {
  name: string;
  stopMethod: "disconnect" | "SIGHUP" | "SIGTERM";
  resistSigterm?: boolean;
};

const lifecycleCases = (
  [
    { name: "owner disconnect", stopMethod: "disconnect" },
    { name: "owner SIGTERM", stopMethod: "SIGTERM" },
    { name: "owner SIGHUP", stopMethod: "SIGHUP" },
    {
      name: "owner disconnect with a SIGTERM-resistant descendant",
      stopMethod: "disconnect",
      resistSigterm: true,
    },
  ] satisfies LifecycleCase[]
).filter(
  ({ stopMethod }) => process.platform !== "win32" || stopMethod !== "SIGHUP"
);

test.each(lifecycleCases)(
  "stops the complete preview process tree on $name",
  async ({ stopMethod, resistSigterm = false }) => {
    const directory = await mkdtemp(
      join(await getLifecycleTestRoot(), "webstudio-preview-owner-")
    );
    const processFile = join(directory, "processes.json");
    const ownerFile = join(directory, "preview-process.json");
    const descendantScript = [
      ...(resistSigterm ? ['process.on("SIGTERM", () => {});'] : []),
      'process.send?.("ready");',
      "setInterval(() => {}, 1000);",
    ].join("\n");
    const childScript = [
      'const { spawn } = require("node:child_process");',
      'const { writeFileSync } = require("node:fs");',
      `const descendant = spawn(process.execPath, ["-e", ${JSON.stringify(descendantScript)}], { stdio: ["ignore", "ignore", "ignore", "ipc"] });`,
      `descendant.once("message", () => writeFileSync(${JSON.stringify(processFile)}, JSON.stringify({ launcher: process.pid, descendant: descendant.pid })));`,
      "setInterval(() => {}, 1000);",
    ].join("\n");
    const supervisor = spawn(
      process.execPath,
      [
        "--import=tsx",
        fileURLToPath(
          new URL("./preview-process-supervisor.ts", import.meta.url)
        ),
        JSON.stringify({
          command: process.execPath,
          args: ["-e", childScript],
          cwd: directory,
          ownerFile,
        }),
      ],
      { stdio: ["ignore", "ignore", "inherit", "ipc"] }
    );
    const supervisorExit = new Promise<void>((resolve) => {
      supervisor.once("exit", () => resolve());
    });
    let ownedProcesses: { launcher: number; descendant: number } | undefined;

    try {
      await waitFor(async () => {
        ownedProcesses = await readFile(processFile, "utf8")
          .then((value) => JSON.parse(value))
          .catch(() => undefined);
        return ownedProcesses !== undefined;
      });
      await expect(readFile(ownerFile, "utf8")).resolves.toContain(
        `"previewPid":${ownedProcesses!.launcher}`
      );
      if (stopMethod === "disconnect") {
        supervisor.disconnect();
      } else {
        supervisor.kill(stopMethod);
      }
      await supervisorExit;
      await waitFor(() => isProcessRunning(ownedProcesses!.launcher) === false);
      expect(isProcessRunning(ownedProcesses!.descendant)).toBe(false);
      await expect(access(ownerFile)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      supervisor.kill("SIGKILL");
      stopProcess(ownedProcesses?.launcher);
      stopProcess(ownedProcesses?.descendant);
      await rm(directory, { recursive: true, force: true });
    }
  }
);
