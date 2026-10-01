import { createServer, type IncomingHttpHeaders } from "node:http";
import { expect } from "@playwright/test";
import { test } from "../test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { waitForChangeToBeSaved } from "../flows/sync-status";
import { withGeneratedPreview } from "../flows/generated-app";
import {
  openComponentsPanel,
  insertComponentPanelOption,
  selectNavigatorItem,
} from "../flows/props-runtime";

test("Webhook Form forwards browser metadata without trusting incoming IP headers", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "visitor-headers@webstudio.test",
  });
  const received: Array<{ headers: IncomingHttpHeaders; body: unknown }> = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    received.push({
      headers: request.headers,
      body: JSON.parse(Buffer.concat(chunks).toString()),
    });
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end("{}");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected webhook server port");
  }
  try {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
      features: ["resourceProp"],
    });
    await waitForCanvasText({ page, text: "Initial content" });
    await selectCanvasTextInstance({ page, text: "Initial content" });
    await openComponentsPanel({ page });
    await insertComponentPanelOption({ page, name: "Webhook Form" });
    await selectNavigatorItem({ page, itemName: "Webhook Form" });
    await page.getByRole("tab", { name: "Settings" }).click();
    const actionInput = page.getByRole("textbox", { name: "Action URL" });
    await actionInput.fill(`http://127.0.0.1:${address.port}/submit`);
    const save = waitForChangeToBeSaved({ page });
    await actionInput.press("Enter");
    await save;
    await withGeneratedPreview({
      projectId: fixture.projectId,
      callback: async ({ url }) => {
        await page.setExtraHTTPHeaders({
          "Accept-Language": "fr-FR,fr;q=0.9",
          "X-Forwarded-For": "192.0.2.66, 192.0.2.67",
          "CF-Connecting-IP": "192.0.2.68",
          Authorization: "Bearer browser-secret",
        });
        await context.addCookies([
          { name: "visitor-secret", value: "private", url },
        ]);
        await page.goto(url);
        const userAgent = await page.evaluate(() => navigator.userAgent);
        expect(received).toHaveLength(0);
        await page.locator('input[name="name"]').fill("Ada");
        await page.locator('input[name="email"]').fill("ada@example.com");
        await page.getByRole("button", { name: "Submit" }).click();
        await expect(
          page.getByText("Thank you for getting in touch!", { exact: true })
        ).toBeVisible();
        expect(received).toHaveLength(1);
        expect(received[0].body).toEqual({
          name: "Ada",
          email: "ada@example.com",
        });
        expect(received[0].headers["user-agent"]).toBe(userAgent);
        expect(received[0].headers["accept-language"]).toBe("fr-FR,fr;q=0.9");
        for (const name of [
          "x-forwarded-for",
          "cf-connecting-ip",
          "cookie",
          "authorization",
          "origin",
          "referer",
        ]) {
          expect(received[0].headers[name]).toBeUndefined();
        }
      },
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
