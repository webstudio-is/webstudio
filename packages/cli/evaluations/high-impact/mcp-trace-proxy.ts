import { appendFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

type JsonRpcId = string | number;

export type BoundedMcpCall = {
  name: string;
  arguments?: { viewport: { width: number; height: number } };
  isError?: true;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

export const getMcpTraceRequest = (value: unknown) => {
  if (isRecord(value) === false || value.method !== "tools/call") {
    return;
  }
  const id = value.id;
  const params = value.params;
  if (
    (typeof id !== "string" && typeof id !== "number") ||
    isRecord(params) === false ||
    typeof params.name !== "string"
  ) {
    return;
  }
  const call: BoundedMcpCall = { name: params.name };
  if (params.name === "screenshot" && isRecord(params.arguments)) {
    const viewport = params.arguments.viewport;
    if (
      isRecord(viewport) &&
      typeof viewport.width === "number" &&
      typeof viewport.height === "number"
    ) {
      call.arguments = {
        viewport: { width: viewport.width, height: viewport.height },
      };
    }
  }
  return { id, call };
};

export const getMcpTraceResponse = (
  value: unknown,
  pending: Map<JsonRpcId, BoundedMcpCall>
) => {
  if (isRecord(value) === false) {
    return;
  }
  const id = value.id;
  if (typeof id !== "string" && typeof id !== "number") {
    return;
  }
  const call = pending.get(id);
  if (call === undefined) {
    return;
  }
  pending.delete(id);
  const result = value.result;
  return value.error !== undefined ||
    (isRecord(result) && result.isError === true)
    ? { ...call, isError: true as const }
    : call;
};

const observeJsonLines = (
  stream: NodeJS.ReadableStream,
  visit: (value: unknown) => void
) => {
  let buffered = "";
  stream.on("data", (chunk) => {
    buffered += String(chunk);
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    for (const line of lines) {
      try {
        visit(JSON.parse(line));
      } catch {}
    }
  });
};

const run = () => {
  const [, , target, tracePath] = process.argv;
  if (target === undefined || tracePath === undefined) {
    throw new Error("Expected target CLI and trace file paths.");
  }
  const pending = new Map<JsonRpcId, BoundedMcpCall>();
  const child = spawn(process.execPath, [target, "mcp"], {
    env: process.env,
    stdio: ["pipe", "pipe", "inherit"],
  });
  observeJsonLines(process.stdin, (value) => {
    const request = getMcpTraceRequest(value);
    if (request !== undefined) {
      pending.set(request.id, request.call);
    }
  });
  observeJsonLines(child.stdout, (value) => {
    const call = getMcpTraceResponse(value, pending);
    if (call !== undefined) {
      appendFileSync(tracePath, `${JSON.stringify(call)}\n`, "utf8");
    }
  });
  process.stdin.pipe(child.stdin);
  child.stdout.pipe(process.stdout);
  child.on("exit", (code, signal) => {
    if (signal !== null) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
};

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run();
}
