import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startFormDeliveryReceiver,
  withGeneratedFormDeliveryPreview,
} from "../flows/generated-form-delivery";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";
import { test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-form-action-combination-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);

test("generated Form executes ten distinct Actions in configured result order and rejects an eleventh", async ({
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
        const submission = (
          await submitPreviewFormViaMcp({
            url,
            input: {
              path: "/",
              selector: `[data-ws-managed-form-id="${formId}"]`,
              values: [
                { name: "name", value: "Ada" },
                { name: "email", value: "ada@example.com" },
                { name: "subject", value: "Ten actions" },
                { name: "message", value: "All actions" },
              ],
              submitter: "button[type=submit]",
              timeout: 30_000,
            },
          })
        ).data;
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
