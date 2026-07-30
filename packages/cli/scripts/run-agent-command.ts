import { spawn } from "node:child_process";

export const runAgentCommand = ({
  command,
  cwd,
  env,
  timeoutMs,
  onStdoutLine,
  signal,
}: {
  command: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  onStdoutLine?: (line: string) => void;
  signal?: AbortSignal;
}) =>
  new Promise<{ exitCode: number; durationMs: number }>((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(process.env.SHELL ?? "/bin/sh", ["-c", command], {
      cwd,
      env,
      stdio: [
        "ignore",
        onStdoutLine === undefined ? "ignore" : "pipe",
        "ignore",
      ],
      detached: process.platform !== "win32",
    });
    let stdoutBuffer = "";
    if (onStdoutLine !== undefined && child.stdout !== null) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdoutBuffer += chunk;
        const lines = stdoutBuffer.split("\n");
        stdoutBuffer = lines.pop() ?? "";
        for (const line of lines) {
          onStdoutLine(line);
        }
      });
    }
    const terminate = () => {
      if (child.pid !== undefined) {
        try {
          process.kill(process.platform === "win32" ? child.pid : -child.pid);
        } catch {}
      }
    };
    const onAbort = () => terminate();
    signal?.addEventListener("abort", onAbort, { once: true });
    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    };
    const timeout = setTimeout(() => {
      terminate();
      cleanup();
      reject(new Error(`Agent command timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("close", (code, childSignal) => {
      cleanup();
      if (onStdoutLine !== undefined && stdoutBuffer.length > 0) {
        onStdoutLine(stdoutBuffer);
      }
      if (childSignal !== null) {
        reject(new Error(`Agent command exited from signal ${childSignal}.`));
        return;
      }
      if (signal?.aborted) {
        reject(new Error("Agent command was aborted."));
        return;
      }
      resolve({ exitCode: code ?? -1, durationMs: Date.now() - startedAt });
    });
    if (signal?.aborted) {
      terminate();
    }
  });
