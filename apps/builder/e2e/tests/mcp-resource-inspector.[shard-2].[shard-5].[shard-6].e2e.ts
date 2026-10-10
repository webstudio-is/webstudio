import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { getProjectBuilderUrl, test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);

const authorEmailForm = async (projectId: string) => {
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
  return JSON.parse(stdout) as {
    formId: string;
    emailResourceIds: string[];
  };
};

test("MCP-authored Resource can load and inspect a safe failed response", async ({
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
  expect(JSON.parse(stdout)).toEqual(
    expect.objectContaining({
      formId: expect.any(String),
      resourceId: expect.any(String),
    })
  );

  await page.goto(
    getProjectBuilderUrl({
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    })
  );
  await selectCanvasTextInstance({ page, text: "Submit" });
  await page.getByRole("tab", { name: "Settings" }).click();

  const variablesHeading = page.getByText("Variables", { exact: true });
  await expect(variablesHeading).toBeVisible();
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
  const requestEditor = dialog.locator('[role="tabpanel"] .cm-content').last();
  await expect(requestEditor).toContainText(
    "http://127.0.0.1/preview-e2e-must-not-run"
  );
  await expect(requestEditor).toContainText('"method": "POST"');

  await responseTab.click();
  await expect(dialog.getByText("502", { exact: true })).toBeVisible();
  const responseEditor = dialog.locator('[role="tabpanel"] .cm-content').last();
  await expect(responseEditor).toContainText("Resource request failed");

  await diagnosticsTab.click();
  await expect(
    dialog.getByText("Resource request failed", { exact: true }).last()
  ).toBeVisible();
});

test("MCP-authored Email Resource loads its Request preview without sending email", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-request-preview@webstudio.test",
    title: "MCP Email Request preview",
    assetNamePrefix: "mcp-email-request-preview-",
    builderToken: "mcp-email-request-preview-builder-token",
  });
  const { emailResourceIds } = await authorEmailForm(fixture.projectId);
  expect(emailResourceIds).toHaveLength(2);

  await page.goto(
    getProjectBuilderUrl({
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    })
  );
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
  await selectCanvasTextInstance({ page, text: "Submit" });
  await page.getByRole("tab", { name: "Settings" }).click();
  const resourceRow = page.getByRole("button", {
    name: "Variable Project recipients",
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
    dialog.getByText("MCP contact notification", { exact: false })
  ).toBeVisible();
  const requestEditor = dialog.locator('[role="tabpanel"] .cm-content').last();
  await expect(requestEditor).toContainText(
    "A visitor sent a message through the contact form."
  );
  expect(submissionRequests).toEqual([]);
});
