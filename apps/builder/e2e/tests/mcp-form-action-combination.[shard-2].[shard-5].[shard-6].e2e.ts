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

test("MCP-authored Form dispatches enabled HTTP and GraphQL Actions in configured result order", async ({
  page,
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
  const { formId, graphqlResourceId, disabledResourceId, httpResourceId } =
    JSON.parse(stdout) as {
      formId: string;
      graphqlResourceId: string;
      disabledResourceId: string;
      httpResourceId: string;
    };
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
        await form.locator('input[name="subject"]').fill("Action combination");
        await form.locator('textarea[name="message"]').fill("Two receivers");
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
        expect(submission.results).toEqual([
          expect.objectContaining({
            resourceId: graphqlResourceId,
            resourceName: "First GraphQL action",
            status: 200,
          }),
          expect.objectContaining({
            resourceId: httpResourceId,
            resourceName: "Last HTTP action",
            status: 200,
          }),
        ]);
        expect(JSON.stringify(submission)).not.toContain(disabledResourceId);
        await expect(form).toHaveAttribute("data-state", "success");
        expect(receiver.deliveries).toHaveLength(2);
        expect(receiver.deliveries.map(({ pathname }) => pathname)).toEqual([
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
