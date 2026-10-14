import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createProjectSessionMcpServer } from "@webstudio-is/project-build/mcp";

const previewModuleUrl = new URL(
  "../../../../packages/cli/src/commands/mcp-preview.ts",
  import.meta.url
).href;
const screenshotModuleUrl = new URL(
  "../../../../packages/cli/src/screenshot.ts",
  import.meta.url
).href;
const { createMcpPreviewHandlers } = await import(previewModuleUrl);
const { createScreenshotCaptureSession } = await import(screenshotModuleUrl);

let payload = "";
for await (const chunk of process.stdin) {
  payload += String(chunk);
  if (payload.length > 8_000_000) {
    throw new Error("MCP Preview submit fixture input is too large.");
  }
}
const request = JSON.parse(payload) as {
  url: string;
  input: Record<string, unknown>;
};
if (
  typeof request.url !== "string" ||
  typeof request.input !== "object" ||
  request.input === null
) {
  throw new Error(
    "Expected one JSON payload with Preview url and submit input."
  );
}
const { url, input } = request;

const previewHandlers = createMcpPreviewHandlers({
  preview: {
    status: () => ({ running: true, url, mode: "iterative" as const }),
    startAndWait: async () => {
      throw new Error("Preview is already running.");
    },
    resolveUrl: (path: string) => new URL(path, url).toString(),
    stop: async () => ({ running: false, url, mode: "iterative" as const }),
  },
  isStale: () => false,
  createCaptureSession: createScreenshotCaptureSession,
});
const server = await createProjectSessionMcpServer({
  operations: [],
  createProjectSession: () => {
    throw new Error("No project mutation in this fixture.");
  },
  executeOperation: async () => {
    throw new Error("No project mutation in this fixture.");
  },
  startPreview: async () => ({
    url,
    running: true,
    mode: "iterative" as const,
  }),
  getPreviewStatus: async () => ({
    url,
    running: true,
    mode: "iterative" as const,
  }),
  submitPreviewForm: previewHandlers.submitForm,
});
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: "preview-submit-e2e", version: "1.0.0" });
try {
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  const result = await client.callTool({
    name: "preview.submit-form",
    arguments: input,
  });
  if (result.isError) {
    throw new Error(
      `MCP submit failed: ${JSON.stringify(result.structuredContent)}`
    );
  }
  process.stdout.write(`${JSON.stringify(result.structuredContent)}\n`);
} finally {
  await Promise.all([
    client.close(),
    server.close(),
    previewHandlers.stopPreview(),
  ]);
}
