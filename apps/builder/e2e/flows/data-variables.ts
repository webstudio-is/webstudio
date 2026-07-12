import { createServer } from "node:http";
import type { Page } from "playwright";
import { selectCanvasTextInstance } from "./canvas-selection";
import { waitForChangeToBeSaved, waitForSyncStatus } from "./sync-status";

const getVariableForm = (page: Page) =>
  page
    .locator("form")
    .filter({ has: page.locator('input[name="name"]') })
    .last();

const closeVariablePanelAndWaitForSave = async ({ page }: { page: Page }) => {
  const save = waitForChangeToBeSaved({ page });
  await page.getByRole("button", { name: "Close" }).last().click();
  await save;
  await page
    .getByText("New Variable", { exact: true })
    .waitFor({ state: "hidden" });
  await waitForSyncStatus({ page, status: "idle" });
};

const openNewVariablePanel = async ({ page }: { page: Page }) => {
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Add data variable" }).click();
  await page.getByText("New Variable", { exact: true }).waitFor();
};

const selectVariableType = async ({
  page,
  next,
}: {
  page: Page;
  next: string;
}) => {
  await page
    .getByText("Type", { exact: true })
    .locator("xpath=following::button[1]")
    .click();
  await page
    .getByRole("option", { name: new RegExp(`^${next}( Pro)?$`) })
    .click();
};

const fillVariableName = async ({
  page,
  name,
}: {
  page: Page;
  name: string;
}) => {
  await getVariableForm(page).locator('input[name="name"]').fill(name);
};

export const selectContentInstance = async ({ page }: { page: Page }) => {
  await selectCanvasTextInstance({ page, text: "Initial content" });
  await page
    .getByText("No instance selected", { exact: true })
    .waitFor({ state: "hidden" });
  await page.getByRole("tab", { name: "Settings" }).click();
  await page
    .getByRole("button", { name: "Add data variable" })
    .waitFor({ state: "visible" });
};

export const bindSelectedTextContentToExpression = async ({
  page,
  expression,
}: {
  page: Page;
  expression: string;
}) => {
  await page.getByText("Text Content", { exact: true }).waitFor();
  await page.getByText("Text Content", { exact: true }).hover();
  await page
    .getByText("Text Content", { exact: true })
    .locator("xpath=following::button[@data-variant][1]")
    .click();
  const bindingDialog = page.getByRole("dialog", { name: "Binding" });
  await bindingDialog.waitFor();

  const expressionEditor = bindingDialog.locator(".cm-content").last();
  await expressionEditor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(expression);

  const save = waitForChangeToBeSaved({ page });
  try {
    await page.keyboard.press("ControlOrMeta+Enter");
    await save;
  } catch (error) {
    const dialogText = await bindingDialog.innerText().catch(() => "");
    throw new Error(
      `Expected Text Content binding ${JSON.stringify(expression)} to save. Binding dialog: ${dialogText}`,
      { cause: error }
    );
  }
  await waitForSyncStatus({ page, status: "idle" });
  await page.keyboard.press("Escape");
};

export const createHttpResourceVariable = async ({
  page,
  name,
  url,
}: {
  page: Page;
  name: string;
  url: string;
}) => {
  await openNewVariablePanel({ page });
  await fillVariableName({ page, name });
  await selectVariableType({ page, next: "Resource" });
  await page.getByRole("textbox", { name: "URL" }).fill(url);
  await closeVariablePanelAndWaitForSave({ page });
};

export const createGraphqlResourceVariable = async ({
  page,
  name,
  url,
  query,
}: {
  page: Page;
  name: string;
  url: string;
  query: string;
}) => {
  await openNewVariablePanel({ page });
  await fillVariableName({ page, name });
  await selectVariableType({ page, next: "GraphQL" });
  await page.getByRole("textbox", { name: "URL" }).fill(url);
  await page.getByRole("textbox", { name: "Query" }).fill(query);
  await closeVariablePanelAndWaitForSave({ page });
};

export const createSystemResourceVariable = async ({
  page,
  name,
  resource = "Sitemap",
}: {
  page: Page;
  name: string;
  resource?: "Sitemap" | "Current Date" | "Assets";
}) => {
  await openNewVariablePanel({ page });
  await fillVariableName({ page, name });
  await selectVariableType({ page, next: "System Resource" });
  if (resource !== "Sitemap") {
    await getVariableForm(page)
      .getByText("Resource", { exact: true })
      .locator("xpath=following::button[1]")
      .click();
    await page.getByRole("option", { name: resource, exact: true }).click();
  }
  await closeVariablePanelAndWaitForSave({ page });
};

export const startJsonResourceServer = async ({ title }: { title: string }) => {
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify({ title }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error("Expected a numeric local resource server port.");
  }
  return {
    url: `http://127.0.0.1:${address.port}/posts`,
    close: async () =>
      await new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

export const startGraphqlResourceServer = async ({
  title,
}: {
  title: string;
}) => {
  const server = createServer((request, response) => {
    if (request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify({ data: { post: { title } } }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error("Expected a numeric local GraphQL server port.");
  }
  return {
    url: `http://127.0.0.1:${address.port}/graphql`,
    close: async () =>
      await new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
