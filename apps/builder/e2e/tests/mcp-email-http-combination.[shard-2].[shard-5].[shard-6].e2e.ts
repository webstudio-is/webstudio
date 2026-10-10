import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { startFormDeliveryReceiver } from "../flows/generated-form-delivery";
import { startLocalEmailReceiver } from "../flows/mcp-email-preview";
import { withMcpEmailHttpPreview } from "../flows/mcp-email-http-preview";
import { test } from "../test";

const execFileAsync = promisify(execFile);

test("MCP-authored Form delivers Email and HTTP Actions in configured result order", async ({
  page,
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
        await page.route("**/*", (route) =>
          new URL(route.request().url()).hostname === "127.0.0.1"
            ? route.continue()
            : route.abort()
        );
        await page.goto(url);
        const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
        await form.locator('input[name="name"]').fill("Ada Lovelace");
        await form.locator('input[name="email"]').fill("ada@example.test");
        await form.locator('input[name="subject"]').fill("Combined delivery");
        await form
          .locator('textarea[name="message"]')
          .fill("One Form, two Actions");
        const submissionPromise = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith("/__ws-form") &&
            response.request().method() === "POST"
        );
        await form.getByRole("button", { name: "Submit" }).click();
        const response = await submissionPromise;
        const submission = await response.json();
        expect(response.status(), JSON.stringify(submission)).toBe(200);
        expect(submission).toMatchObject({ success: true, errors: [] });
        expect(submission.results).toEqual([
          expect.objectContaining({
            resourceId: emailResourceId,
            resourceName: "Project recipients",
            status: 200,
          }),
          expect.objectContaining({
            resourceId: httpResourceId,
            resourceName: "Combined HTTP action",
            status: 200,
          }),
        ]);
        await expect(form).toHaveAttribute("data-state", "success");

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
