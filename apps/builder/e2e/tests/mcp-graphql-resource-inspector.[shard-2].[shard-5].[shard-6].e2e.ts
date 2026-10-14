import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { waitForCanvasFrame } from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { getProjectBuilderUrl, test } from "../test";

const execFileAsync = promisify(execFile);
const query = "mutation Record($name: String!) { record(name: $name) }";
const url = "http://127.0.0.1/preview-e2e-must-not-run";

test("MCP-authored GraphQL Form action retains its request and response snapshots after submission", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-graphql-inspector@webstudio.test",
    title: "MCP GraphQL Resource inspector",
    assetNamePrefix: "mcp-graphql-inspector-",
    builderToken: "mcp-graphql-inspector-builder-token",
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
          "../fixtures/mcp-graphql-resource-inspector-author.ts",
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
  const { formId, graphqlResourceId } = JSON.parse(stdout) as {
    formId: string;
    graphqlResourceId: string;
  };
  const submissions: import("@playwright/test").Request[] = [];
  let resourceReloads = 0;
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/rest/preview-form") {
      submissions.push(request);
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
  await form.locator('input[name="name"]').fill("Ada Lovelace");
  await form.locator('input[name="email"]').fill("ada@example.com");
  await form.locator('input[name="subject"]').fill("GraphQL inspection");
  await form.locator('textarea[name="message"]').fill("Inspect the exchange");
  const submission = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/rest/preview-form" &&
      response.request().method() === "POST"
  );
  await form.getByRole("button", { name: "Submit" }).click();
  const submissionResponse = await submission;
  expect(submissionResponse.status()).toBe(502);
  expect(submissions).toHaveLength(1);
  expect(submissions[0].method()).toBe("POST");
  const responseBody = await submissionResponse.json();
  expect(responseBody).toMatchObject({
    success: false,
    status: 502,
    results: [
      {
        resourceId: graphqlResourceId,
        status: 502,
        body: {
          ok: false,
          error: {
            code: "NETWORK_ERROR",
            message: "Resource request failed",
            retryable: true,
          },
        },
      },
    ],
    errors: [
      {
        resourceId: graphqlResourceId,
        status: 502,
        message: "Resource request failed",
      },
    ],
  });
  expect(responseBody.previewExchanges).toHaveLength(2);
  for (const exchange of responseBody.previewExchanges) {
    expect(exchange).toMatchObject({
      resourceId: graphqlResourceId,
      resourceName: "GraphQL inspection action",
      kind: "http",
      request: {
        method: "POST",
        url,
        body: { query, variables: { name: "Ada Lovelace" } },
      },
      response: {
        status: 502,
        statusText: "Resource request failed",
        body: {
          ok: false,
          error: {
            code: "NETWORK_ERROR",
            message: "Resource request failed",
            retryable: true,
          },
        },
      },
    });
    expect(exchange.request.headers).toContainEqual({
      name: "content-type",
      value: "application/json",
    });
  }
  await expect(form).toHaveAttribute("data-state", "error");
  const resourceReloadsAfterSubmission = resourceReloads;

  await page.getByRole("button", { name: "Toggle preview" }).click();
  await selectCanvasTextInstance({ page, text: "Submit" });
  await page.getByRole("tab", { name: "Settings" }).click();
  await page
    .getByRole("button", { name: "Variable GraphQL inspection action" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Load data" })).toHaveCount(
    0
  );

  await dialog.getByRole("tab", { name: "Request" }).click();
  const requestEditor = dialog.locator('[role="tabpanel"] .cm-content').last();
  await expect(requestEditor).toContainText('"attempt": 1');
  await expect(requestEditor).toContainText('"attempt": 2');
  await expect(requestEditor).toContainText('"method": "POST"');
  await expect(requestEditor).toContainText(url);
  await expect(requestEditor).toContainText("mutation Record");
  await expect(requestEditor).toContainText("record(name");
  await expect(requestEditor).toContainText('"name": "Ada Lovelace"');
  await expect(requestEditor).toContainText("application/json");

  await dialog.getByRole("tab", { name: "Response" }).click();
  const responseEditor = dialog.locator('[role="tabpanel"] .cm-content').last();
  await expect(responseEditor).toContainText('"attempt": 1');
  await expect(responseEditor).toContainText('"attempt": 2');
  await expect(responseEditor).toContainText('"status": 502');
  await expect(responseEditor).toContainText(
    '"statusText": "Resource request failed"'
  );
  await expect(responseEditor).toContainText("NETWORK_ERROR");
  await expect(responseEditor).toContainText('"retryable": true');

  expect(submissions).toHaveLength(1);
  expect(resourceReloads).toBe(resourceReloadsAfterSubmission);
});
