import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startFormDeliveryReceiver,
  withGeneratedFormDeliveryPreview,
} from "../flows/generated-form-delivery";
import { test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-form-action-combination-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);

test("generated Form executes ten distinct Actions in configured result order and rejects an eleventh", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-ten-actions@webstudio.test",
    title: "MCP Form ten Actions",
    assetNamePrefix: "mcp-form-ten-actions-",
    builderToken: "mcp-form-ten-actions-builder-token",
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
      "ten-actions",
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
  const { formId, resourceIds, rejectedResourceId } = JSON.parse(stdout) as {
    formId: string;
    resourceIds: string[];
    rejectedResourceId: string;
  };
  expect(resourceIds).toHaveLength(10);
  expect(new Set([...resourceIds, rejectedResourceId]).size).toBe(11);

  const receiver = await startFormDeliveryReceiver();
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
        await form.locator('input[name="subject"]').fill("Ten actions");
        await form.locator('textarea[name="message"]').fill("All actions");
        const responsePromise = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith("/__ws-form") &&
            response.request().method() === "POST"
        );
        await form.getByRole("button", { name: "Submit" }).click();
        const response = await responsePromise;
        const submission = await response.json();
        expect(response.status()).toBe(200);
        expect(submission.success).toBe(true);
        expect(submission.errors).toEqual([]);
        expect(submission.results).toEqual(
          resourceIds.map((resourceId, index) =>
            expect.objectContaining({
              resourceId,
              resourceName: `HTTP action ${index + 1}`,
              status: 200,
            })
          )
        );
        expect(JSON.stringify(submission)).not.toContain(rejectedResourceId);
        await expect(form).toHaveAttribute("data-state", "success");
        expect(receiver.deliveries).toHaveLength(10);
        expect(
          receiver.deliveries
            .map(
              ({ body }) => JSON.parse(body) as { index: number; name: string }
            )
            .sort((left, right) => left.index - right.index)
        ).toEqual(
          Array.from({ length: 10 }, (_, index) => ({
            index: index + 1,
            name: "Ada",
          }))
        );
      },
    });
  } finally {
    await receiver.close();
  }
});
