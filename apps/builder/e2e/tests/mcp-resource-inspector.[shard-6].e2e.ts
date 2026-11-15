import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { openProjectBuilder } from "../flows/builder";
import { runFormAuthor } from "../flows/mcp-form-author";
import { test } from "../test";

test("MCP-authored Resources show blocked HTTP failures and preview email without sending", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-resource-inspector@webstudio.test",
    title: "MCP Resource inspector",
    assetNamePrefix: "mcp-resource-inspector-",
    builderToken: "mcp-resource-inspector-builder-token",
  });
  const { stdout } = await runFormAuthor(
    "mcp-managed-form-author",
    fixture.projectId,
    "default",
    "email"
  );
  const [blockedForm, emailForm] = stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line)) as [
    { formId: string; resourceId: string },
    { formId: string; emailResourceIds: string[] },
  ];
  expect(blockedForm).toEqual(
    expect.objectContaining({
      formId: expect.any(String),
      resourceId: expect.any(String),
    })
  );
  expect(emailForm.emailResourceIds).toHaveLength(2);

  const canvas = await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  const selectSubmitButton = async (formId: string) => {
    await canvas
      .locator(`[data-ws-id="${formId}"]`)
      .getByRole("button", { name: "Submit" })
      .click();
    await page.getByRole("tab", { name: "Settings" }).click();
  };

  await test.step("Inspect a blocked HTTP Resource request, response, and diagnostics", async () => {
    await selectSubmitButton(blockedForm.formId);
    await expect(page.getByText("Variables", { exact: true })).toBeVisible();
    const resourceRow = page.getByRole("button", {
      name: "Variable Blocked HTTP action",
    });
    await expect(resourceRow).toBeVisible();
    await resourceRow.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText("Edit variable", { exact: true })
    ).toBeVisible();
    const requestTab = dialog.getByRole("tab", { name: "Request" });
    const responseTab = dialog.getByRole("tab", { name: "Response" });
    const diagnosticsTab = dialog.getByRole("tab", { name: "Diagnostics" });
    await expect(requestTab).toBeVisible();
    await expect(responseTab).toBeVisible();
    await expect(diagnosticsTab).toBeVisible();

    const resourceLoadRequest = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === "/rest/resources-loader" &&
        request.method() === "POST"
    );
    const requestResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/rest/resources-loader" &&
        response.request().method() === "POST"
    );
    await requestTab.click();
    await dialog.getByRole("button", { name: "Load data" }).click();
    const loadedResponse = await requestResponse;
    expect(loadedResponse.ok()).toBe(true);
    const requestBody = (await resourceLoadRequest).postDataJSON() as unknown[];
    expect(requestBody).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "http://127.0.0.1/preview-e2e-must-not-run",
          method: "post",
        }),
      ])
    );
    const responseBody = await loadedResponse.json();
    expect(JSON.stringify(responseBody)).toContain("Resource request failed");

    await expect(responseTab).toBeVisible();
    const requestEditor = dialog
      .locator('[role="tabpanel"] .cm-content')
      .last();
    await expect(requestEditor).toContainText(
      "http://127.0.0.1/preview-e2e-must-not-run"
    );
    await expect(requestEditor).toContainText('"method": "POST"');

    await responseTab.click();
    await expect(dialog.getByText("502", { exact: true })).toBeVisible();
    const responseEditor = dialog
      .locator('[role="tabpanel"] .cm-content')
      .last();
    await expect(responseEditor).toContainText("Resource request failed");

    await diagnosticsTab.click();
    await expect(
      dialog.getByText("Resource request failed", { exact: true }).last()
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  await test.step("Load an Email Resource request without sending email", async () => {
    const submissionRequests: string[] = [];
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (
        pathname.startsWith("/__ws-form") ||
        pathname.toLowerCase().includes("email") ||
        pathname.toLowerCase().includes("send")
      ) {
        submissionRequests.push(`${request.method()} ${pathname}`);
      }
    });
    await selectSubmitButton(emailForm.formId);
    const resourceRow = page.getByRole("button", {
      name: "Variable Email to owner",
    });
    await expect(resourceRow).toBeVisible();
    await resourceRow.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const requestTab = dialog.getByRole("tab", { name: "Request" });
    await expect(requestTab).toBeVisible();
    await requestTab.click();

    await dialog.getByRole("button", { name: "Load data" }).click();

    await expect(
      dialog.getByText("owner@mcp.test", { exact: false })
    ).toBeVisible();
    await expect(
      dialog.getByText("Contact form:", { exact: false })
    ).toBeVisible();
    const requestEditor = dialog
      .locator('[role="tabpanel"] .cm-content')
      .last();
    await expect(requestEditor).toContainText('"text": ""');
    await expect(requestEditor).not.toContainText("Submitted fields:");
    expect(submissionRequests).toEqual([]);
  });
});
