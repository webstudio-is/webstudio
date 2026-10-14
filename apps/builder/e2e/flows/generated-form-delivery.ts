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
  new URL("../fixtures/generated-form-delivery-preview.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);
const tsxPath = fileURLToPath(import.meta.resolve("tsx"));
const cliTsconfigPath = fileURLToPath(
  new URL("../../../../packages/cli/tsconfig.local.json", import.meta.url)
);

export const withGeneratedFormDeliveryPreview = async <Result>({
  projectId,
  receiverPort,
  callback,
}: {
  projectId: string;
  receiverPort: number;
  callback: ({ url }: { url: string }) => Promise<Result>;
}) => {
  const tempDir = await mkdtemp(join(tmpdir(), "webstudio-e2e-form-delivery-"));
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
        String(receiverPort),
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

export const startFormDeliveryReceiver = async () => {
  const deliveries: Array<{
    pathname: string;
    method: string;
    contentType: string;
    body: string;
    bodyBytes: number[];
  }> = [];
  const receiver = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    deliveries.push({
      pathname,
      method: request.method ?? "",
      contentType: request.headers["content-type"] ?? "",
      body: body.toString("utf8"),
      bodyBytes: Array.from(body),
    });
    if (pathname === "/submit") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ delivered: true }));
    } else if (pathname === "/reject") {
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Temporary local E2E failure" }));
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    receiver.once("error", reject);
    receiver.listen(0, "127.0.0.1", resolve);
  });
  const address = receiver.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected a local receiver port");
  }
  return {
    port: address.port,
    deliveries,
    close: async () =>
      await new Promise<void>((resolve) => receiver.close(() => resolve())),
  };
};
