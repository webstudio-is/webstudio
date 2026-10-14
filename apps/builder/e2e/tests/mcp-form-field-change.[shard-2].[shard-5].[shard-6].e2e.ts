import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedFormDeliveryPreview } from "../flows/generated-form-delivery";
import { startFormCallbackReceiver } from "../flows/form-callback-receiver";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";
import { test } from "../test";

const execFileAsync = promisify(execFile);

test("MCP form filling runs an authored React field-change effect before submission", async ({
  context,
}) => {
  const receiver = await startFormCallbackReceiver();
  try {
    const fixture = await createContentModeProject({
      context,
      email: "mcp-field-change@webstudio.test",
      title: "MCP field change",
      assetNamePrefix: "mcp-field-change-",
    });
    await execFileAsync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--import",
        fileURLToPath(
          new URL(
            "../../../../scripts/register-react-global.ts",
            import.meta.url
          )
        ),
        "--conditions=webstudio",
        fileURLToPath(
          new URL("../fixtures/mcp-form-callbacks-author.ts", import.meta.url)
        ),
        fixture.projectId,
        "managed",
        receiver.url,
        "field-change",
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
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        const submission = (
          await submitPreviewFormViaMcp({
            url,
            input: {
              path: "/",
              selector: "#callback-form",
              values: [{ name: "outcome", value: "success" }],
              submitter: "button[type=submit]",
              timeout: 30_000,
            },
          })
        ).data;
        expect(submission).toMatchObject({
          status: "submitted",
          formState: "success",
        });
        expect(receiver.deliveries).toEqual([
          { outcome: "success", changeCount: "1" },
        ]);
      },
    });
  } finally {
    await receiver.close();
  }
});
