import { execFile } from "node:child_process";
import { createServer, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedFormDeliveryPreview } from "../flows/generated-form-delivery";
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
    if (deliveries.length > 2) {
      response.writeHead(409).end();
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

test("MCP-authored Form starts both selected Actions before either receiver responds", async ({
  page,
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
  const { formId, graphqlResourceId, httpResourceId, disabledResourceId } =
    JSON.parse(stdout) as {
      formId: string;
      graphqlResourceId: string;
      httpResourceId: string;
      disabledResourceId: string;
    };
  const receiver = await startBarrierReceiver();
  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        await page.route("**/*", (route) =>
          new URL(route.request().url()).hostname === "127.0.0.1"
            ? route.continue()
            : route.abort()
        );
        await page.goto(url);
        const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
        await form.locator('input[name="name"]').fill("Ada");
        await form.locator('input[name="email"]').fill("ada@example.com");
        await form.locator('input[name="subject"]').fill("Parallel Actions");
        await form.locator('textarea[name="message"]').fill("Both receivers");
        const responsePromise = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith("/__ws-form") &&
            response.request().method() === "POST"
        );
        await form.getByRole("button", { name: "Submit" }).click();
        const response = await responsePromise;
        const submission = await response.json();
        expect(receiver.barrierReached).toBe(true);
        expect(response.status()).toBe(200);
        expect(submission.success).toBe(true);
        expect(submission.errors).toEqual([]);
        expect(submission.results).toEqual([
          expect.objectContaining({
            resourceId: graphqlResourceId,
            status: 200,
          }),
          expect.objectContaining({ resourceId: httpResourceId, status: 200 }),
        ]);
        expect(JSON.stringify(submission)).not.toContain(disabledResourceId);
        expect(receiver.deliveries).toHaveLength(2);
        expect(
          receiver.deliveries.some((body) => body.includes("mutation Record"))
        ).toBe(true);
        expect(
          receiver.deliveries.some((body) =>
            body.includes('"subject":"Parallel Actions"')
          )
        ).toBe(true);
        await expect(form).toHaveAttribute("data-state", "success");
      },
    });
  } finally {
    await receiver.close();
  }
});
