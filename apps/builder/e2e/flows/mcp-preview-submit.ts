import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import type {
  ProjectSessionPreviewSubmitFormInput,
  ProjectSessionPreviewSubmitFormResult,
} from "@webstudio-is/project-build/mcp";

const runnerPath = fileURLToPath(
  new URL("../fixtures/mcp-preview-submit-client.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);
const tsxPath = fileURLToPath(import.meta.resolve("tsx"));
const cliTsconfigPath = fileURLToPath(
  new URL("../../../../packages/cli/tsconfig.local.json", import.meta.url)
);

const getMcpBrowserPath = () => {
  const chromiumPath = chromium.executablePath();
  const match = chromiumPath.match(/^(.*)[\\/]chromium-(\d+)[\\/]/);
  if (match === null) {
    return chromiumPath;
  }
  const [, cacheDir, revision] = match;
  const shellPath = join(
    cacheDir,
    `chromium_headless_shell-${revision}`,
    process.platform === "darwin"
      ? "chrome-mac"
      : process.platform === "win32"
      ? "chrome-win"
      : "chrome-linux",
    process.platform === "win32" ? "headless_shell.exe" : "headless_shell"
  );
  return existsSync(shellPath) ? shellPath : chromiumPath;
};

/** One JSON payload goes over stdin so base64 files are not limited by argv size. */
export const submitPreviewFormViaMcp = async ({
  url,
  input,
}: {
  url: string;
  input: ProjectSessionPreviewSubmitFormInput;
}): Promise<{ ok: true; data: ProjectSessionPreviewSubmitFormResult }> => {
  const child = spawn(
    process.execPath,
    [
      "--import",
      tsxPath,
      "--import",
      reactGlobalPath,
      "--conditions=webstudio",
      runnerPath,
    ],
    {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: cliTsconfigPath,
        WEBSTUDIO_BROWSER_PATH: getMcpBrowserPath(),
      },
    }
  );
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });
  const timeout = setTimeout(() => child.kill("SIGTERM"), 90_000);
  try {
    child.stdin.end(JSON.stringify({ url, input }));
    await new Promise<void>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `MCP Preview submit fixture exited ${code}: ${stderr.slice(
                -4000
              )}`
            )
          );
        }
      });
    });
  } finally {
    clearTimeout(timeout);
  }
  const result = JSON.parse(stdout) as {
    ok?: boolean;
    data?: ProjectSessionPreviewSubmitFormResult;
  };
  if (result.ok !== true || result.data === undefined) {
    throw new Error(
      `MCP Preview submit returned an invalid result: ${stdout.slice(-4000)}`
    );
  }
  return { ok: true, data: result.data };
};
