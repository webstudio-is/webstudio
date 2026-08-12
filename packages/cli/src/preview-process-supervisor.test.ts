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

const getLifecycleTestRoot = async () => {
  if (process.env.WEBSTUDIO_WSL_9P_TEST_ROOT !== undefined) {
    return process.env.WEBSTUDIO_WSL_9P_TEST_ROOT;
  }
  const isWsl = await readFile("/proc/sys/kernel/osrelease", "utf8")
    .then((value) => value.toLowerCase().includes("microsoft"))
    .catch(() => false);
  return isWsl && cwd().startsWith("/mnt/") ? cwd() : tmpdir();
};

test.each(["disconnect", "SIGTERM"] as const)(
  "stops the complete preview process tree on owner %s",
  async (stopMethod) => {
    const directory = await mkdtemp(
      join(await getLifecycleTestRoot(), "webstudio-preview-owner-")
    );
    const processFile = join(directory, "processes.json");
    const ownerFile = join(directory, "preview-process.json");
    const childScript = [
      'const { spawn } = require("node:child_process");',
      'const { writeFileSync } = require("node:fs");',
      'const descendant = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });',
      `writeFileSync(${JSON.stringify(processFile)}, JSON.stringify({ launcher: process.pid, descendant: descendant.pid }));`,
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

    try {
      let ownedProcesses: { launcher: number; descendant: number } | undefined;
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
      await waitFor(
        () =>
          isProcessRunning(ownedProcesses!.launcher) === false &&
          isProcessRunning(ownedProcesses!.descendant) === false
      );
      await supervisorExit;
      await expect(access(ownerFile)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      supervisor.kill("SIGKILL");
      await rm(directory, { recursive: true, force: true });
    }
  }
);
