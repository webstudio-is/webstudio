import { execFile } from "node:child_process";
import { createServer, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedFormDeliveryPreview } from "../flows/generated-form-delivery";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";
import { test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-form-action-combination-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);

const startBarrierReceiver = async () => {
  const deliveries: string[] = [];
  const pending: ServerResponse[] = [];
  let barrierReached = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const receiver = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    if (request.method !== "POST" || request.url !== "/submit") {
      response.writeHead(404).end();
      return;
    }
    deliveries.push(Buffer.concat(chunks).toString("utf8"));
    if (deliveries.length > 3) {
      response.writeHead(409).end();
      return;
    }
    if (barrierReached) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ delivered: true }));
      return;
    }
    pending.push(response);
    if (pending.length === 1) {
      // A serial dispatcher can never get the second response before the first.
      timeout = setTimeout(() => {
        for (const waiting of pending.splice(0)) {
          waiting.writeHead(504).end("Second Action did not arrive");
        }
      }, 10_000);
    } else {
      barrierReached = true;
      clearTimeout(timeout);
      for (const waiting of pending.splice(0)) {
        waiting.writeHead(200, { "content-type": "application/json" });
        waiting.end(JSON.stringify({ delivered: true }));
      }
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
    get barrierReached() {
      return barrierReached;
    },
    close: async () => {
      clearTimeout(timeout);
      for (const waiting of pending.splice(0)) {
        waiting.writeHead(503).end();
      }
      await new Promise<void>((resolve) => receiver.close(() => resolve()));
    },
  };
};

test("MCP-authored Form starts connected Actions concurrently and runs all three", async ({
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-action-concurrency@webstudio.test",
    title: "MCP Form Action concurrency",
    assetNamePrefix: "mcp-form-action-concurrency-",
    builderToken: "mcp-form-action-concurrency-builder-token",
  });
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      reactGlobalPath,
      "--conditions=webstudio",
      authorPath,
      fixture.projectId,
    ],
    {
      timeout: 60_000,
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: fileURLToPath(
          new URL(
            "../../../../packages/cli/tsconfig.local.json",
            import.meta.url
          )
        ),
      },
    }
  );
  const { formId, graphqlResourceId, httpResourceId, middleResourceId } =
    JSON.parse(stdout) as {
      formId: string;
      graphqlResourceId: string;
      httpResourceId: string;
      middleResourceId: string;
    };
  const receiver = await startBarrierReceiver();
  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        const submission = (
          await submitPreviewFormViaMcp({
            url,
            input: {
              path: "/",
              selector: `[data-ws-managed-form-id="${formId}"]`,
              values: [
                { name: "name", value: "Ada" },
                { name: "email", value: "ada@example.com" },
                { name: "subject", value: "Parallel Actions" },
                { name: "message", value: "Both receivers" },
              ],
              submitter: "button[type=submit]",
              timeout: 30_000,
            },
          })
        ).data;
        expect(receiver.barrierReached).toBe(true);
        expect(submission).toMatchObject({
          status: "submitted",
          formState: "success",
          errors: [],
        });
        expect(submission.exchanges).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: 200,
              url: expect.stringContaining("/__ws-form"),
            }),
          ])
        );
        expect(submission.results).toEqual([
          expect.objectContaining({
            resourceId: graphqlResourceId,
            status: 200,
          }),
          expect.objectContaining({
            resourceId: middleResourceId,
            status: 200,
          }),
          expect.objectContaining({ resourceId: httpResourceId, status: 200 }),
        ]);
        expect(receiver.deliveries).toHaveLength(3);
        expect(
          receiver.deliveries.some((body) => body.includes("mutation Record"))
        ).toBe(true);
        expect(
          receiver.deliveries.some((body) =>
            body.includes('"subject":"Parallel Actions"')
          )
        ).toBe(true);
      },
    });
  } finally {
    await receiver.close();
  }
});
