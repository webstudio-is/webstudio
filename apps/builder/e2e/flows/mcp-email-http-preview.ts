import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDevBuild } from "../db";
import { stopChildProcess } from "../process";
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

export const withMcpEmailHttpPreview = async <Result>({
  projectId,
  emailPort,
  httpPort,
  callback,
}: {
  projectId: string;
  emailPort: number;
  httpPort: number;
  callback: ({ url }: { url: string }) => Promise<Result>;
}) => {
  const tempDir = await mkdtemp(
    join(tmpdir(), "webstudio-e2e-mcp-email-http-")
  );
  let preview: ChildProcess | undefined;
  try {
    const build = await loadDevBuild({ projectId });
    await mkdir(join(tempDir, ".webstudio"), { recursive: true });
    await writeFile(
      join(tempDir, ".webstudio", "data.json"),
      `${JSON.stringify(createLocalBundleFromDevBuild(build))}\n`
    );
    const port = await getAvailablePort();
    const output: string[] = [];
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
    return await callback({ url });
  } finally {
    if (preview !== undefined) {
      await stopChildProcess(preview, { killGroup: true });
    }
    await rm(tempDir, { recursive: true, force: true });
  }
};
