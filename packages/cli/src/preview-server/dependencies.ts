import { spawn } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export type PreviewServerDependencies = {
  spawn: typeof spawn;
  parentProcess: {
    pid: number;
    once: (signal: NodeJS.Signals, handler: () => void) => unknown;
    off: (signal: NodeJS.Signals, handler: () => void) => unknown;
    kill: (pid: number, signal: NodeJS.Signals) => boolean;
  };
  fetch: typeof fetch;
  cp: typeof cp;
  mkdir: typeof mkdir;
  readdir: typeof readdir;
  readFile: typeof readFile;
  readPackageFile: (path: string) => string;
  resolveLauncherPath: (path: string) => string;
  writeFile: typeof writeFile;
  sleep: (ms: number) => Promise<void>;
  nodeExecPath: string;
  npmExecPath?: string;
  processExecArgv: string[];
  supervisorPath: string;
  platform: typeof process.platform;
};

const supervisorPath = fileURLToPath(
  new URL(
    import.meta.url.includes("/src/")
      ? "./preview-process-supervisor.ts"
      : "./preview-process-supervisor.js",
    import.meta.url
  )
);

export const defaultPreviewServerDependencies: PreviewServerDependencies = {
  spawn,
  parentProcess: process,
  fetch,
  cp,
  mkdir,
  readdir,
  readFile,
  readPackageFile: (path) => readFileSync(path, "utf8"),
  resolveLauncherPath: realpathSync,
  writeFile,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  nodeExecPath: process.execPath,
  npmExecPath: process.env.npm_execpath,
  processExecArgv: process.execArgv,
  supervisorPath,
  platform: process.platform,
};
