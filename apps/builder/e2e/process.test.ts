import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import { expect, test, vi } from "vitest";
import { stopChildProcess } from "./process";

const createChild = () => {
  const child = new EventEmitter() as ChildProcess;
  Object.defineProperties(child, {
    exitCode: { value: null, writable: true },
    signalCode: { value: null, writable: true },
  });
  child.kill = vi.fn(() => true);
  return child;
};

test("stops a child gracefully without escalating", async () => {
  const child = createChild();
  vi.mocked(child.kill).mockImplementation((signal) => {
    Object.defineProperty(child, "signalCode", {
      value: signal,
      writable: true,
    });
    child.emit("exit", null, signal);
    return true;
  });

  await stopChildProcess(child, { timeoutMs: 1 });

  expect(child.kill).toHaveBeenCalledTimes(1);
  expect(child.kill).toHaveBeenCalledWith("SIGTERM");
});

test("escalates a child that ignores SIGTERM", async () => {
  const child = createChild();
  vi.mocked(child.kill).mockImplementation((signal) => {
    if (signal === "SIGKILL") {
      Object.defineProperty(child, "signalCode", {
        value: signal,
        writable: true,
      });
      child.emit("exit", null, signal);
    }
    return true;
  });

  await stopChildProcess(child, { timeoutMs: 1 });

  expect(child.kill).toHaveBeenNthCalledWith(1, "SIGTERM");
  expect(child.kill).toHaveBeenNthCalledWith(2, "SIGKILL");
});

test("rejects when a child remains alive after SIGKILL", async () => {
  const child = createChild();
  Object.defineProperty(child, "pid", { value: 42 });

  await expect(stopChildProcess(child, { timeoutMs: 1 })).rejects.toThrow(
    "Child process 42 did not exit after SIGKILL"
  );

  expect(child.kill).toHaveBeenNthCalledWith(1, "SIGTERM");
  expect(child.kill).toHaveBeenNthCalledWith(2, "SIGKILL");
});

test.runIf(process.platform !== "win32")(
  "signals the detached process group used by generated previews",
  async () => {
    const child = createChild();
    Object.defineProperty(child, "pid", { value: 42 });
    let groupRunning = true;
    const kill = vi
      .spyOn(process, "kill")
      .mockImplementation((_pid, signal) => {
        if (signal === 0) {
          if (groupRunning) {
            return true;
          }
          throw Object.assign(new Error("Process group not found"), {
            code: "ESRCH",
          });
        }
        if (signal === "SIGKILL") {
          groupRunning = false;
          Object.defineProperty(child, "signalCode", {
            value: signal,
            writable: true,
          });
          child.emit("exit", null, signal);
        }
        return true;
      });

    await stopChildProcess(child, { killGroup: true, timeoutMs: 1 });

    expect(kill).toHaveBeenCalledWith(-42, "SIGTERM");
    expect(kill).toHaveBeenCalledWith(-42, "SIGKILL");
    expect(child.kill).not.toHaveBeenCalled();
    kill.mockRestore();
  }
);

test.runIf(process.platform !== "win32")(
  "uses the child state when a stopped process group cannot be probed",
  async () => {
    const child = createChild();
    Object.defineProperty(child, "pid", { value: 42 });
    let signalSent = false;
    const kill = vi
      .spyOn(process, "kill")
      .mockImplementation((_pid, signal) => {
        if (signal === 0 && signalSent) {
          throw Object.assign(new Error("Process group cannot be probed"), {
            code: "EPERM",
          });
        }
        if (signal === "SIGTERM") {
          signalSent = true;
          Object.defineProperty(child, "signalCode", {
            value: signal,
            writable: true,
          });
          child.emit("exit", null, signal);
        }
        return true;
      });

    await stopChildProcess(child, { killGroup: true, timeoutMs: 1 });

    expect(kill).toHaveBeenCalledWith(-42, "SIGTERM");
    expect(child.kill).not.toHaveBeenCalled();
    kill.mockRestore();
  }
);
