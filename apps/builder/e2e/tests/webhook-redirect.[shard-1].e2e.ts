import { createServer } from "node:http";
import { expect } from "@playwright/test";
import { test } from "../test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { createPageFromTemplate } from "../flows/pages-panel";
import { createStringVariable } from "../flows/data-variables";
import {
  waitForChangeToBeSaved,
  waitForSyncStatus,
} from "../flows/sync-status";
import { withGeneratedPreview } from "../flows/generated-app";
import {
  openComponentsPanel,
  insertComponentPanelOption,
  selectNavigatorItem,
  bindSelectedPropertyToExpression,
  startWebhookServer,
} from "../flows/props-runtime";

// Each scenario owns its project and local HTTP servers.
test.describe.configure({ mode: "parallel" });

for (const redirectMode of ["page", "external binding"] as const) {
  test(`Webhook Form success redirect to ${redirectMode} persists and follows a successful retry`, async ({
    page,
    context,
  }) => {
    const fixture = await createContentModeProject({
      context,
      email: `redirect-${redirectMode.replaceAll(" ", "-")}@webstudio.test`,
    });
    let attempts = 0;
    const webhook = await startWebhookServer({
      onRequest: async () => (++attempts === 1 ? 503 : 200),
    });
    const destinationRequests: string[] = [];
    const destinationServer = createServer((request, response) => {
      destinationRequests.push(request.url ?? "");
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end("<h1>Your brochure is ready</h1>");
    });
    await new Promise<void>((resolve) =>
      destinationServer.listen(0, "127.0.0.1", resolve)
    );
    const address = destinationServer.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected redirect server port");
    }
    const externalDestination = `http://127.0.0.1:${address.port}/thanks?source=form#brochure`;
    try {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
        features: ["resourceProp"],
      });
      await waitForCanvasText({ page, text: "Initial content" });
      if (redirectMode === "page") {
        await createPageFromTemplate({
          page,
          templateName: fixture.pageTemplateName,
          pageName: "Thank you",
          canvasText: fixture.pageTemplateText,
        });
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
          features: ["resourceProp"],
        });
        await waitForCanvasText({ page, text: "Initial content" });
      }
      await selectCanvasTextInstance({ page, text: "Initial content" });
      await openComponentsPanel({ page });
      await insertComponentPanelOption({ page, name: "Webhook Form" });
      await selectNavigatorItem({ page, itemName: "Webhook Form" });
      await page.getByRole("tab", { name: "Settings" }).click();
      const actionInput = page.getByRole("textbox", { name: "Action URL" });
      await actionInput.fill(webhook.url);
      const saveAction = waitForChangeToBeSaved({ page });
      await actionInput.press("Enter");
      await saveAction;
      await expect(
        page.getByText("Success redirect", { exact: true })
      ).toBeVisible();
      if (redirectMode === "page") {
        await page.getByRole("radio", { name: "Page", exact: true }).click();
        await page
          .getByRole("combobox")
          .filter({ hasText: "Choose page" })
          .click();
        const save = waitForChangeToBeSaved({ page });
        await page
          .getByRole("option", { name: "Thank you", exact: true })
          .click();
        await save;
      } else {
        await createStringVariable({
          page,
          name: "ThankYouUrl",
          value: externalDestination,
        });
        await bindSelectedPropertyToExpression({
          page,
          label: "Success redirect",
          expression: "ThankYouUrl",
        });
      }
      await waitForSyncStatus({ page, status: "idle" });
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
        features: ["resourceProp"],
      });
      await waitForCanvasText({ page, text: "Initial content" });
      await selectCanvasTextInstance({ page, text: "Submit" });
      await selectNavigatorItem({ page, itemName: "Webhook Form" });
      await page.getByRole("tab", { name: "Settings" }).click();
      if (redirectMode === "page") {
        await expect(
          page.getByRole("combobox").filter({ hasText: "Thank you" })
        ).toBeVisible();
      } else {
        await expect(page.getByPlaceholder("https://www.url.com")).toHaveValue(
          externalDestination
        );
      }
      await withGeneratedPreview({
        projectId: fixture.projectId,
        callback: async ({ url }) => {
          await page.goto(url);
          expect(webhook.requests).toHaveLength(0);
          await expect(page.locator("form[successredirect]")).toHaveCount(0);
          await page.locator('input[name="name"]').fill("Ada");
          await page.locator('input[name="email"]').fill("ada@example.com");
          await page.getByRole("button", { name: "Submit" }).click();
          await expect(
            page.getByText("Sorry, something went wrong.", { exact: true })
          ).toBeVisible();
          await expect(page).toHaveURL(url);
          expect(destinationRequests).toEqual([]);
          await page.getByRole("button", { name: "Submit" }).click();
          if (redirectMode === "page") {
            await expect(page).toHaveURL(new URL("/thank-you", url).href);
            await expect(
              page.getByText(fixture.pageTemplateText, { exact: true })
            ).toBeVisible();
          } else {
            await expect(page).toHaveURL(externalDestination);
            await expect(
              page.getByRole("heading", { name: "Your brochure is ready" })
            ).toBeVisible();
            expect(
              destinationRequests.filter((path) => path.startsWith("/thanks"))
            ).toEqual(["/thanks?source=form"]);
          }
          expect(webhook.requests).toHaveLength(2);
          expect(webhook.requests.map(({ body }) => body)).toEqual([
            { name: "Ada", email: "ada@example.com" },
            { name: "Ada", email: "ada@example.com" },
          ]);
        },
      });
    } finally {
      await webhook.close();
      await new Promise<void>((resolve) =>
        destinationServer.close(() => resolve())
      );
    }
  });
}
