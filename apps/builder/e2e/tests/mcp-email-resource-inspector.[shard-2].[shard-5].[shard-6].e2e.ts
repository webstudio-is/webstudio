import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { loadDevBuild } from "../db";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { waitForCanvasFrame } from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { getProjectBuilderUrl, test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);

test("MCP Email inspector loads Request without sending and shows the captured submission Response", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-inspector@webstudio.test",
    title: "MCP Email inspector",
    assetNamePrefix: "mcp-email-inspector-",
    builderToken: "mcp-email-inspector-builder-token",
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
      "email",
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
  const { formId, emailResourceIds } = JSON.parse(stdout) as {
    formId: string;
    emailResourceIds: string[];
  };
  expect(emailResourceIds).toHaveLength(2);
  const authoredBuild = await loadDevBuild({ projectId: fixture.projectId });
  const authoredResources = JSON.parse(authoredBuild.resources) as Array<{
    id: string;
    name: string;
  }>;
  const ownerResourceId = authoredResources.find(
    ({ name }) => name === "Email to owner"
  )?.id;
  expect(ownerResourceId).toBeDefined();
  expect(emailResourceIds).toContain(ownerResourceId);

  // The Builder inspection store lives in this browser session. Keep this
  // local UI mock to verify its Request and Response tabs.
  let submissions = 0;
  let resourceLoads = 0;
  await page.route(
    (url) => url.pathname === "/rest/preview-form",
    async (route) => {
      submissions += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          status: 200,
          results: [
            {
              resourceId: ownerResourceId,
              status: 200,
              body: { id: "public-form-result" },
            },
          ],
          errors: [],
          previewExchanges: [
            {
              resourceId: ownerResourceId,
              resourceName: "Email to owner",
              kind: "email",
              request: {
                method: "POST",
                url: "http://127.0.0.1/mock-email/send",
                headers: [],
                body: { to: "owner@mcp.test", subject: "Contact form" },
                truncated: false,
              },
              response: {
                status: 200,
                statusText: "OK",
                headers: [
                  { name: "x-request-id", value: "local-email-request" },
                ],
                body: { id: "captured-local-email-response" },
                truncated: false,
              },
            },
          ],
        }),
      });
    }
  );
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/rest/resources-loader") {
      resourceLoads += 1;
    }
  });

  await page.goto(
    getProjectBuilderUrl({
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    })
  );
  const canvas = await waitForCanvasFrame({ page });
  const form = canvas.locator(`[data-ws-managed-form-id="${formId}"]`);
  await selectCanvasTextInstance({ page, text: "Submit" });
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Variable Email to owner" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("tab")).toHaveText([
    "Request",
    "Response",
    "Diagnostics",
  ]);
  const resourceLoadsBeforeRequest = resourceLoads;
  await dialog.getByRole("tab", { name: "Request" }).click();
  await dialog.getByRole("button", { name: "Load data" }).click();
  const requestEditor = dialog.locator('[role="tabpanel"] .cm-content').last();
  await expect(requestEditor).toContainText("owner@mcp.test");
  expect(submissions).toBe(0);
  expect(resourceLoads).toBe(resourceLoadsBeforeRequest);

  await dialog.getByRole("tab", { name: "Response" }).click();
  await expect(
    dialog.getByText("Submit this Form in Preview", { exact: false })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();

  await page.getByRole("button", { name: "Toggle preview" }).click();
  await form.locator('input[name="name"]').fill("Ada Lovelace");
  await form.locator('input[name="email"]').fill("ada@example.test");
  await form.locator('input[name="subject"]').fill("Inspector test");
  await form.locator('textarea[name="message"]').fill("Captured locally");
  await form.getByRole("button", { name: "Submit" }).click();
  await expect(form).toHaveAttribute("data-state", "success");
  expect(submissions).toBe(1);

  await page.getByRole("button", { name: "Toggle preview" }).click();
  await selectCanvasTextInstance({ page, text: "Submit" });
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Variable Email to owner" }).click();
  await expect(dialog.getByRole("tab")).toHaveText([
    "Request",
    "Response",
    "Diagnostics",
  ]);
  await dialog.getByRole("tab", { name: "Response" }).click();
  const responseEditor = dialog.locator('[role="tabpanel"] .cm-content').last();
  await expect(responseEditor).toContainText("captured-local-email-response");
  await expect(responseEditor).toContainText("local-email-request");
  await expect(responseEditor).not.toContainText("public-form-result");
  expect(submissions).toBe(1);
  expect(resourceLoads).toBe(resourceLoadsBeforeRequest);
});
