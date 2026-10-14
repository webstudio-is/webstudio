import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { startFormDeliveryReceiver } from "../flows/generated-form-delivery";
import { startLocalEmailReceiver } from "../flows/mcp-email-preview";
import { withMcpEmailHttpPreview } from "../flows/mcp-email-http-preview";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";
import { test } from "../test";

const execFileAsync = promisify(execFile);

test("MCP-authored Form delivers Email and HTTP Actions in configured result order", async ({
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-http-combination@webstudio.test",
    title: "MCP Email and HTTP combination",
    assetNamePrefix: "mcp-email-http-combination-",
    builderToken: "mcp-email-http-combination-builder-token",
  });
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      fileURLToPath(
        new URL("../../../../scripts/register-react-global.ts", import.meta.url)
      ),
      "--conditions=webstudio",
      fileURLToPath(
        new URL(
          "../fixtures/mcp-email-http-combination-author.ts",
          import.meta.url
        )
      ),
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
  const { formId, emailResourceId, httpResourceId } = JSON.parse(stdout) as {
    formId: string;
    emailResourceId: string;
    httpResourceId: string;
  };
  const emailReceiver = await startLocalEmailReceiver();
  const httpReceiver = await startFormDeliveryReceiver();
  try {
    await withMcpEmailHttpPreview({
      projectId: fixture.projectId,
      emailPort: emailReceiver.port,
      httpPort: httpReceiver.port,
      callback: async ({ url }) => {
        const submission = await submitPreviewFormViaMcp({
          url,
          input: {
            path: "/",
            selector: `[data-ws-managed-form-id="${formId}"]`,
            values: [
              { name: "name", value: "Ada Lovelace" },
              { name: "email", value: "ada@example.test" },
              { name: "subject", value: "Combined delivery" },
              { name: "message", value: "One Form, two Actions" },
            ],
            submitter: "button[type=submit]",
            timeout: 30_000,
          },
        });
        expect(submission.ok).toBe(true);
        expect(submission.data).toMatchObject({
          status: "submitted",
          formState: "success",
          errors: [],
        });
        expect(submission.data.results).toEqual([
          expect.objectContaining({
            resourceId: emailResourceId,
            resourceName: "Email to owner",
            status: 200,
          }),
          expect.objectContaining({
            resourceId: httpResourceId,
            resourceName: "Combined HTTP action",
            status: 200,
          }),
        ]);
        expect(submission.data.exchanges).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: 200,
              url: expect.stringContaining("/__ws-form"),
            }),
          ])
        );

        expect(emailReceiver.messages).toHaveLength(1);
        expect(emailReceiver.messages[0]?.to).toEqual([
          { address: "combined@mcp.test" },
        ]);
        expect(emailReceiver.messages[0]?.text).toBe(
          "Combined action exact body."
        );
        expect(httpReceiver.deliveries).toHaveLength(1);
        expect(httpReceiver.deliveries[0]).toMatchObject({
          pathname: "/submit",
          method: "POST",
        });
        expect(httpReceiver.deliveries[0]?.contentType).toContain(
          "application/json"
        );
        expect(JSON.parse(httpReceiver.deliveries[0]?.body ?? "null")).toEqual({
          name: "Ada Lovelace",
          email: "ada@example.test",
          subject: "Combined delivery",
          message: "One Form, two Actions",
        });
      },
    });
  } finally {
    await Promise.all([emailReceiver.close(), httpReceiver.close()]);
  }
});
