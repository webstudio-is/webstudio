import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
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
  new URL("../fixtures/mcp-email-preview.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);
const tsxPath = fileURLToPath(import.meta.resolve("tsx"));
const cliTsconfigPath = fileURLToPath(
  new URL("../../../../packages/cli/tsconfig.local.json", import.meta.url)
);

export type CapturedEmail = {
  to: Array<{ address: string; name?: string }>;
  subject: string;
  text: string;
  replyTo?: { address: string; name?: string };
  fromName?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    contentBase64: string;
  }>;
};

export const startLocalEmailReceiver = async () => {
  const messages: CapturedEmail[] = [];
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/send") {
      response.writeHead(404).end();
      return;
    }
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks).toString("utf8");
      if (body.length === 0) {
        response.writeHead(400).end("Email request body is empty");
        return;
      }
      messages.push(JSON.parse(body));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ id: `local-email-${messages.length}` }));
    } catch {
      if (!response.destroyed) {
        response.writeHead(400).end("Email request body is invalid");
      }
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected a local email receiver port");
  }
  return {
    port: address.port,
    messages,
    close: async () =>
      await new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

export const withMcpEmailPreview = async <Result>({
  projectId,
  emailPort,
  callback,
}: {
  projectId: string;
  emailPort: number;
  callback: ({ url }: { url: string }) => Promise<Result>;
}) => {
  const tempDir = await mkdtemp(join(tmpdir(), "webstudio-e2e-mcp-email-"));
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
