import { vi } from "vitest";
import { startPreviewServer } from "./server";
import type { PreviewServerDependencies } from "./dependencies";

export const readWindowsPackageFile = (path: string) => {
  if (path.endsWith("node_modules\\pnpm\\package.json")) {
    return JSON.stringify({
      name: "pnpm",
      bin: { pnpm: "bin/pnpm.cjs" },
    });
  }
  if (path.endsWith("node_modules\\npm\\package.json")) {
    return JSON.stringify({
      name: "npm",
      bin: { npm: "bin/npm-cli.js", npx: "bin/npx-cli.js" },
    });
  }
  throw Object.assign(new Error("missing"), { code: "ENOENT" });
};
export const resolveWindowsLauncherPath = (path: string) => path;

export const createDependencies = (
  overrides: Partial<PreviewServerDependencies> = {}
): PreviewServerDependencies => ({
  spawn: vi.fn(),
  fetch: vi.fn(async () => new Response("", { status: 200 })),
  cp: vi.fn(async () => undefined),
  mkdir: vi.fn(async () => undefined),
  readdir: vi.fn(async () => []),
  readFile: vi.fn(async () => "") as never,
  readPackageFile: readWindowsPackageFile,
  resolveLauncherPath: resolveWindowsLauncherPath,
  writeFile: vi.fn(async () => undefined) as never,
  sleep: vi.fn(async () => undefined),
  parentProcess: {
    pid: 456,
    once: vi.fn(),
    off: vi.fn(),
    kill: vi.fn(() => true),
  },
  nodeExecPath: "/usr/bin/node",
  npmExecPath: undefined,
  processExecArgv: [],
  supervisorPath: "/tmp/preview-process-supervisor.js",
  platform: "linux",
  ...overrides,
});

export const createPreviewProcess = (
  overrides: Partial<ReturnType<typeof startPreviewServer>["process"]> = {}
) =>
  ({
    pid: 123,
    killed: false,
    exitCode: null,
    signalCode: null,
    connected: true,
    once: vi.fn(),
    disconnect: vi.fn(),
    kill: vi.fn(() => true),
    ...overrides,
  }) as ReturnType<typeof startPreviewServer>["process"];

export const resolveProcessExit = (
  process: ReturnType<typeof startPreviewServer>["process"],
  code: number | null = 0
) => {
  vi.mocked(
    process.once as (event: string, callback: unknown) => unknown
  ).mockImplementation((event, callback) => {
    if (event === "exit" && typeof callback === "function") {
      (
        callback as (code: number | null, signal: NodeJS.Signals | null) => void
      )(code, null);
    }
    return process;
  });
};
