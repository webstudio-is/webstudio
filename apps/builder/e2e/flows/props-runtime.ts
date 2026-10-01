import { createServer } from "node:http";
import type { Page } from "@playwright/test";
import { openNavigatorPanel } from "./navigator";
import { waitForChangeToBeSaved, waitForSyncStatus } from "./sync-status";

export const openComponentsPanel = async ({ page }: { page: Page }) => {
  await page.getByRole("tab", { name: "Components" }).click();
  await page.getByPlaceholder("Find components").waitFor();
};

export const insertComponentPanelOption = async ({
  page,
  name,
  component,
}: {
  page: Page;
  name: string;
  component?: string;
}) => {
  const search = page.getByPlaceholder("Find components");
  await search.fill(name);
  const option =
    component === undefined
      ? page.getByRole("option", { name, exact: true })
      : page.locator(`[data-drag-component="${component}"]`);
  await option.click();
  await waitForSyncStatus({ page, status: "idle" });
};

export const selectNavigatorItem = async ({
  page,
  itemName,
}: {
  page: Page;
  itemName: string;
}) => {
  await openNavigatorPanel({ page });
  const item = page
    .locator("[data-navigator-tree] [data-tree-button]")
    .filter({ hasText: itemName })
    .last();
  await item.waitFor({ state: "visible" });
  await item.click();
  await item.click();
};

export const bindSelectedPropertyToExpression = async ({
  page,
  label,
  expression,
}: {
  page: Page;
  label: string;
  expression: string;
}) => {
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByText(label, { exact: true }).waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.getByText(label, { exact: true }).hover();
  await page
    .getByText(label, { exact: true })
    .locator("xpath=following::button[@data-variant][1]")
    .click();

  const bindingDialog = page.getByRole("dialog", { name: "Binding" });
  await bindingDialog.waitFor();
  const expressionEditor = bindingDialog.locator(".cm-content").last();
  await expressionEditor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(expression);

  const save = waitForChangeToBeSaved({ page });
  await page.keyboard.press("ControlOrMeta+Enter");
  await save;
  await waitForSyncStatus({ page, status: "idle" });
  await page.keyboard.press("Escape");
};

export const startWebhookServer = async ({
  multipart = false,
  onRequest = async () => 200,
}: { multipart?: boolean; onRequest?: () => Promise<number> } = {}) => {
  const requests: Array<{
    method: string | undefined;
    url: string | undefined;
    accept: string | undefined;
    body: unknown;
  }> = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    const bytes = Buffer.concat(chunks);
    let body: unknown;
    try {
      if (multipart) {
        const data = await new Response(new Uint8Array(bytes), {
          headers: { "Content-Type": request.headers["content-type"] ?? "" },
        }).formData();
        body = await Promise.all(
          Array.from(data, async ([name, value]) => [
            name,
            typeof value === "string"
              ? value
              : {
                  name: value.name,
                  type: value.type,
                  bytes: Array.from(new Uint8Array(await value.arrayBuffer())),
                },
          ])
        );
      } else {
        const bodyText = bytes.toString("utf8");
        body = bodyText === "" ? undefined : JSON.parse(bodyText);
      }
    } catch (error) {
      body = { error: String(error) };
    }
    requests.push({
      method: request.method,
      url: request.url,
      accept: request.headers.accept,
      body,
    });
    response.writeHead(await onRequest(), {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify({ success: true }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error("Expected a numeric webhook server port.");
  }
  return {
    requests,
    url: `http://127.0.0.1:${address.port}/submit`,
    close: async () =>
      await new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
