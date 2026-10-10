import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { waitForCanvasFrame } from "../flows/builder";
import { startFormDeliveryReceiver } from "../flows/generated-form-delivery";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { getProjectBuilderUrl, test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);

const authorRedirectForm = async (projectId: string, actionUrl: string) => {
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      reactGlobalPath,
      "--conditions=webstudio",
      authorPath,
      projectId,
      JSON.stringify({ mode: "redirect", fail: false, actionUrl }),
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
  return JSON.parse(stdout) as {
    formId: string;
    successfulResourceId: string;
  };
};

test("MCP-authored Form submission exposes its saved HTTP exchange without another dispatch", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-resource-snapshot@webstudio.test",
    title: "MCP Form Resource submission snapshot",
    assetNamePrefix: "mcp-form-resource-snapshot-",
    builderToken: "mcp-form-resource-snapshot-builder-token",
  });
  const receiver = await startFormDeliveryReceiver();
  const actionUrl = `http://127.0.0.1:${receiver.port}/submit`;

  try {
    const { formId, successfulResourceId } = await authorRedirectForm(
      fixture.projectId,
      actionUrl
    );

    const previewRequests: import("@playwright/test").Request[] = [];
    let resourceReloads = 0;
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/rest/preview-form") {
        previewRequests.push(request);
      }
      if (pathname === "/rest/resources-loader") {
        resourceReloads += 1;
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
    await page.getByRole("button", { name: "Toggle preview" }).click();
    await expect(
      page.getByRole("button", { name: "Toggle preview" })
    ).toHaveAttribute("aria-pressed", "true");

    await form.locator('input[name="name"]').fill("Ada Lovelace");
    await form.locator('input[name="email"]').fill("ada@example.com");
    await form.locator('input[name="subject"]').fill("Inspector test");
    await form
      .locator('textarea[name="message"]')
      .fill("Inspect the saved HTTP exchange");
    const submission = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/rest/preview-form" &&
        response.request().method() === "POST"
    );
    await form.getByRole("button", { name: "Submit" }).click();
    const submissionResponse = await submission;
    expect(submissionResponse.status()).toBe(502);
    const response = await submissionResponse.json();
    expect(response).toMatchObject({
      success: false,
      status: 502,
      results: [
        {
          resourceId: successfulResourceId,
          status: 502,
          body: {
            error: { code: "NETWORK_ERROR", retryable: true },
          },
        },
      ],
      errors: [
        {
          resourceId: successfulResourceId,
          status: 502,
        },
      ],
    });
    expect(response.previewExchanges).toHaveLength(2);
    for (const exchange of response.previewExchanges) {
      expect(exchange).toMatchObject({
        resourceId: successfulResourceId,
        resourceName: "Redirect success action",
        kind: "http",
        request: {
          method: "POST",
          url: actionUrl,
          headers: expect.arrayContaining([
            { name: "content-type", value: "application/json" },
          ]),
          body: expect.objectContaining({
            name: "Ada Lovelace",
            email: "ada@example.com",
            subject: "Inspector test",
            message: "Inspect the saved HTTP exchange",
          }),
        },
        response: {
          status: 502,
          body: { error: { code: "NETWORK_ERROR", retryable: true } },
        },
      });
    }
    await expect(form).toHaveAttribute("data-state", "error");
    expect(previewRequests).toHaveLength(1);
    expect(receiver.deliveries).toHaveLength(0);
    const resourceReloadsAfterSubmission = resourceReloads;

    await page.getByRole("button", { name: "Toggle preview" }).click();
    await expect(
      page.getByRole("button", { name: "Toggle preview" })
    ).toHaveAttribute("aria-pressed", "false");
    await selectCanvasTextInstance({ page, text: "Submit" });
    await page.getByRole("tab", { name: "Settings" }).click();
    const resourceRow = page.getByRole("button", {
      name: "Variable Redirect success action",
    });
    await expect(resourceRow).toBeVisible();
    await resourceRow.click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("Edit variable", { exact: true })
    ).toBeVisible();
    const requestTab = dialog.getByRole("tab", { name: "Request" });
    const responseTab = dialog.getByRole("tab", { name: "Response" });
    await expect(requestTab).toBeVisible();
    await expect(responseTab).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Load data" })).toHaveCount(
      0
    );

    await requestTab.click();
    const requestEditor = dialog
      .locator('[role="tabpanel"] .cm-content')
      .last();
    await expect(requestEditor).toContainText('"method": "POST"');
    await expect(requestEditor).toContainText(actionUrl);
    await expect(requestEditor).toContainText('"content-type"');
    await expect(requestEditor).toContainText('"email": "ada@example.com"');

    await responseTab.click();
    const responseEditor = dialog
      .locator('[role="tabpanel"] .cm-content')
      .last();
    await expect(responseEditor).toContainText('"status": 502');
    await expect(responseEditor).toContainText('"code": "NETWORK_ERROR"');
    await expect(responseEditor).toContainText('"retryable": true');

    // Opening the editor must display the captured exchange, not dispatch the
    // Form Action again or request fresh Resource data.
    expect(previewRequests).toHaveLength(1);
    expect(receiver.deliveries).toHaveLength(0);
    expect(resourceReloads).toBe(resourceReloadsAfterSubmission);
  } finally {
    await receiver.close();
  }
});
