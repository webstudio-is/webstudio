import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDevBuild } from "../db";
import { stopChildProcess } from "../process";
import { logPerf } from "../perf";
import {
  createLocalBundleFromDevBuild,
  getAvailablePort,
  waitForGeneratedPreview,
} from "./generated-app";

const runnerPath = fileURLToPath(
  new URL("../fixtures/mcp-email-http-preview.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);
const tsxPath = fileURLToPath(import.meta.resolve("tsx"));
const cliTsconfigPath = fileURLToPath(
  new URL("../../../../packages/cli/tsconfig.local.json", import.meta.url)
);

// Temporary markers for the shard 6 Linux timing run.
const profileShard6Preview =
  process.env.CI !== undefined && process.env.E2E_TEST_SHARD === "shard-6";

export const withMcpEmailHttpPreview = async <Result>({
  emailPort,
  httpPort,
  callback,
  ...source
}: {
  emailPort: number;
  httpPort: number;
  callback: ({ url }: { url: string }) => Promise<Result>;
} & (
  | { projectId: string }
  | { build: Awaited<ReturnType<typeof loadDevBuild>> }
)) => {
  const tempDir = await mkdtemp(
    join(tmpdir(), "webstudio-e2e-mcp-email-http-")
  );
  let preview: ChildProcess | undefined;
  try {
    const build =
      "build" in source
        ? source.build
        : await loadDevBuild({ projectId: source.projectId });
    await mkdir(join(tempDir, ".webstudio"), { recursive: true });
    await writeFile(
      join(tempDir, ".webstudio", "data.json"),
      `${JSON.stringify(createLocalBundleFromDevBuild(build))}\n`
    );
    const port = await getAvailablePort();
    const output: string[] = [];
    const previewStartedAt = Date.now();
    preview = spawn(
      process.execPath,
      [
        "--import",
        tsxPath,
        "--import",
        reactGlobalPath,
        "--conditions=webstudio",
        runnerPath,
        String(port),
        String(emailPort),
        String(httpPort),
      ],
      {
        cwd: tempDir,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          PWD: tempDir,
          TSX_TSCONFIG_PATH: cliTsconfigPath,
        },
      }
    );
    const appendOutput = (chunk: unknown) => {
      output.push(String(chunk));
      while (output.join("").length > 8_000) {
        output.shift();
      }
    };
    preview.stdout?.on("data", appendOutput);
    preview.stderr?.on("data", appendOutput);
    const url = `http://127.0.0.1:${port}/`;
    await waitForGeneratedPreview({
      process: preview,
      url,
      output: () => output.join(""),
    });
    if (profileShard6Preview) {
      logPerf("shard 6 Preview build and startup", previewStartedAt);
    }
    return await callback({ url });
  } finally {
    if (preview !== undefined) {
      const shutdownStartedAt = Date.now();
      try {
        await stopChildProcess(preview, { killGroup: true });
      } finally {
        if (profileShard6Preview) {
          logPerf("shard 6 Preview process group shutdown", shutdownStartedAt);
        }
      }
    }
    const removeStartedAt = Date.now();
    await rm(tempDir, { recursive: true, force: true });
    if (profileShard6Preview) {
      logPerf("shard 6 Preview temporary directory removal", removeStartedAt);
    }
  }
};
