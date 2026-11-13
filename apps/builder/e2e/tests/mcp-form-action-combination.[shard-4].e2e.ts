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

test("MCP-authored Form dispatches all Actions in configured result order", async ({
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-action-combination@webstudio.test",
    title: "MCP Form Action combination",
    assetNamePrefix: "mcp-form-action-combination-",
    builderToken: "mcp-form-action-combination-builder-token",
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
          "../fixtures/mcp-form-action-combination-author.ts",
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
  const { formId, graphqlResourceId, middleResourceId, httpResourceId } =
    JSON.parse(stdout) as {
      formId: string;
      graphqlResourceId: string;
      middleResourceId: string;
      httpResourceId: string;
    };
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
                { name: "subject", value: "Action combination" },
                { name: "message", value: "Two receivers" },
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
        expect(submission.results).toEqual([
          expect.objectContaining({
            resourceId: graphqlResourceId,
            resourceName: "First GraphQL action",
            status: 200,
          }),
          expect.objectContaining({
            resourceId: middleResourceId,
            resourceName: "Middle HTTP action",
            status: 200,
          }),
          expect.objectContaining({
            resourceId: httpResourceId,
            resourceName: "Last HTTP action",
            status: 200,
          }),
        ]);
        expect(receiver.deliveries).toHaveLength(3);
        expect(receiver.deliveries.map(({ pathname }) => pathname)).toEqual([
          "/submit",
          "/submit",
          "/submit",
        ]);
        const graphqlDelivery = receiver.deliveries.find(({ body }) =>
          body.includes("mutation Record")
        );
        const httpDelivery = receiver.deliveries.find(
          ({ body }) => !body.includes("mutation Record")
        );
        expect(graphqlDelivery).toMatchObject({ method: "POST" });
        expect(graphqlDelivery?.contentType).toContain("application/json");
        expect(JSON.parse(graphqlDelivery?.body ?? "null")).toMatchObject({
          query: "mutation Record($name: String!) { record(name: $name) }",
          variables: { name: "Ada" },
        });
        expect(httpDelivery).toMatchObject({ method: "POST" });
        expect(JSON.parse(httpDelivery?.body ?? "null")).toMatchObject({
          name: "Ada",
          email: "ada@example.com",
          subject: "Action combination",
          message: "Two receivers",
        });
      },
    });
  } finally {
    await receiver.close();
  }
});
