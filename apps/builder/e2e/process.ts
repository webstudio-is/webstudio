import type { ChildProcess } from "node:child_process";

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const hasExited = (child: ChildProcess) =>
  child.exitCode !== null || child.signalCode !== null;

const isProcessGroupRunning = (child: ChildProcess, pid: number) => {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") {
      return false;
    }
    if (code === "EPERM") {
      return hasExited(child) === false;
    }
    throw error;
  }
};

export const stopChildProcess = async (
  child: ChildProcess,
  {
    killGroup = false,
    timeoutMs = 5_000,
  }: { killGroup?: boolean; timeoutMs?: number } = {}
) => {
  const usesProcessGroup =
    killGroup && process.platform !== "win32" && child.pid !== undefined;
  const isRunning = () =>
    usesProcessGroup
      ? isProcessGroupRunning(child, child.pid as number)
      : hasExited(child) === false;
  const waitUntilStopped = async () => {
    const deadline = Date.now() + timeoutMs;
    while (isRunning() && Date.now() < deadline) {
      await delay(Math.min(25, Math.max(1, deadline - Date.now())));
    }
    return isRunning() === false;
  };

  if (isRunning() === false) {
    return;
  }
  const sendSignal = (signal: NodeJS.Signals) => {
    if (usesProcessGroup) {
      try {
        process.kill(-(child.pid as number), signal);
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ESRCH") {
          return;
        }
      }
    }
    child.kill(signal);
  };

  sendSignal("SIGTERM");
  if (await waitUntilStopped()) {
    return;
  }

  sendSignal("SIGKILL");
  if ((await waitUntilStopped()) === false) {
    throw new Error(
      `Child process${child.pid === undefined ? "" : ` ${child.pid}`} did not exit after SIGKILL`
    );
  }
};

export const closeChildProcessInput = async (
  child: ChildProcess,
  timeoutMs = 5_000
) => {
  if (hasExited(child)) {
    return;
  }
  const stdin = child.stdin;
  if (stdin === null) {
    throw new Error("Child process stdin is unavailable");
  }
  const closed = new Promise<boolean>((resolve) => {
    const onClose = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      child.off("close", onClose);
      resolve(false);
    }, timeoutMs);
    child.once("close", onClose);
  });
  stdin.end();
  if ((await closed) === false) {
    await stopChildProcess(child, { timeoutMs: 1_000 });
  }
};
