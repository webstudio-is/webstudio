import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import type {
  ProjectSessionPreviewSubmitFormInput,
  ProjectSessionPreviewSubmitFormResult,
} from "@webstudio-is/project-build/mcp";
import { closeChildProcessInput } from "../process";
import { measure } from "../perf";

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

type SubmitRequest = {
  url: string;
  input: ProjectSessionPreviewSubmitFormInput;
};

const startClient = () => {
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
  const lines = createInterface({ input: child.stdout });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderr = (stderr + chunk).slice(-4000);
  });
  const stopOnParentExit = () => child.kill("SIGTERM");
  process.once("exit", stopOnParentExit);
  child.once("close", () => {
    process.off("exit", stopOnParentExit);
    if (client?.child === child) {
      client = undefined;
    }
  });
  return { child, lines, stderr: () => stderr };
};

let client: ReturnType<typeof startClient> | undefined;
let queue = Promise.resolve();

export const closePreviewFormMcpClient = async () => {
  await queue;
  const activeClient = client;
  if (activeClient !== undefined) {
    await closeChildProcessInput(activeClient.child);
    client = undefined;
  }
};

const submit = async ({ url, input }: SubmitRequest) => {
  const activeClient = (client ??= startClient());
  const { child, lines } = activeClient;
  let timeout: NodeJS.Timeout | undefined;
  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      const onLine = (line: string) => {
        cleanup();
        resolve(line);
      };
      const onClose = (code: number | null) => {
        cleanup();
        reject(
          new Error(
            `MCP Preview submit fixture exited ${code}: ${activeClient.stderr()}`
          )
        );
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        lines.off("line", onLine);
        child.off("close", onClose);
        child.off("error", onError);
      };
      lines.once("line", onLine);
      child.once("close", onClose);
      child.once("error", onError);
      timeout = setTimeout(() => {
        child.kill("SIGTERM");
      }, 90_000);
      child.stdin.write(`${JSON.stringify({ url, input })}\n`, (error) => {
        if (error !== null && error !== undefined) {
          onError(error);
        }
      });
    });
    const result = JSON.parse(stdout) as {
      ok?: boolean;
      data?: ProjectSessionPreviewSubmitFormResult;
    };
    if (result.ok !== true || result.data === undefined) {
      throw new Error(
        `MCP Preview submit returned an invalid result: ${stdout.slice(-4000)}`
      );
    }
    return { ok: true as const, data: result.data };
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
};

/** Keep the real MCP server and browser session across submissions in one worker. */
export const submitPreviewFormViaMcp = (
  request: SubmitRequest
): Promise<{ ok: true; data: ProjectSessionPreviewSubmitFormResult }> => {
  const result = queue.then(() =>
    measure("MCP preview form submission", () => submit(request))
  );
  queue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};
