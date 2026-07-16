import { spawn } from "node:child_process";

export const runAgentCommand = ({
  command,
  cwd,
  env,
  timeoutMs,
}: {
  command: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
}) =>
  new Promise<{ exitCode: number; durationMs: number }>((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(process.env.SHELL ?? "/bin/sh", ["-c", command], {
      cwd,
      env,
      stdio: "ignore",
      detached: process.platform !== "win32",
    });
    const timeout = setTimeout(() => {
      if (child.pid !== undefined) {
        try {
          process.kill(process.platform === "win32" ? child.pid : -child.pid);
        } catch {}
      }
      reject(new Error(`Agent command timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (signal !== null) {
        reject(new Error(`Agent command exited from signal ${signal}.`));
        return;
      }
      resolve({ exitCode: code ?? -1, durationMs: Date.now() - startedAt });
    });
  });
