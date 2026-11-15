import { expect } from "@playwright/test";
import { createProjectThroughApi } from "../fixtures/create-project";
import { withGeneratedPreview } from "../flows/generated-app";
import { startLegacyFormRouteReceiver } from "../flows/legacy-form-route-receiver";
import {
  startPreviewFormMcpClient,
  submitPreviewFormViaMcp,
} from "../flows/mcp-preview-submit";
import { runFormAuthor } from "../flows/mcp-form-author";
import { measure } from "../perf";
import { test } from "../test";

test("MCP-edited saved deprecated Webhook Form action uses current dynamic route params in generated Preview", async ({
  page,
  context,
}) => {
  const receiver = await startLegacyFormRouteReceiver();
  try {
    await startPreviewFormMcpClient();
    const projectId = await createProjectThroughApi({
      context,
      email: "mcp-legacy-form-route@webstudio.test",
      title: "MCP legacy Form route",
    });
    await measure("author legacy form route through MCP", () =>
      runFormAuthor(
        "mcp-legacy-form-route-author",
        projectId,
        "https://mcp-delivery.example/submit"
      )
    );
    await withGeneratedPreview({
      projectId,
      evaluationReceiverPort: new URL(receiver.url).port,
      callback: async ({ url }) => {
        await page.route("**/*", (route) =>
          new URL(route.request().url()).hostname === "127.0.0.1"
            ? route.continue()
            : route.abort()
        );
        await page.goto(url);
        await page.getByRole("link", { name: "Open first route" }).click();
        await expect(page).toHaveURL(new URL("/legacy-route/first", url).href);
        const form = page.locator("#legacy-route-form");
        const output = page.locator("#legacy-route-output");
        await expect(output).toHaveText("Route: first");
        await expect(form).toBeVisible();

        const documentMarker = await page.evaluate(() => {
          const marker = crypto.randomUUID();
          (
            window as Window & { __legacyRouteMarker?: string }
          ).__legacyRouteMarker = marker;
          return marker;
        });
        await page.getByRole("link", { name: "Open second route" }).click();
        await expect(page).toHaveURL(new URL("/legacy-route/second", url).href);
        await expect(output).toHaveText("Route: second");
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                (window as Window & { __legacyRouteMarker?: string })
                  .__legacyRouteMarker
            )
          )
          .toBe(documentMarker);

        const submission = await submitPreviewFormViaMcp({
          url,
          input: {
            path: "/legacy-route/second",
            selector: "#legacy-route-form",
            values: [{ name: "message", value: "Current route" }],
            submitter: 'button[type="submit"]',
            timeout: 30_000,
          },
        });
        expect(submission.ok).toBe(true);
        expect(submission.data).toMatchObject({
          status: "submitted",
          formState: "success",
          errors: [],
        });
        expect(submission.data.exchanges).toEqual(
          expect.arrayContaining([expect.objectContaining({ status: 200 })])
        );
        expect(receiver.deliveries).toEqual([
          {
            method: "POST",
            slug: "second",
            routeHeader: "second",
            body: { message: "Current route" },
          },
        ]);
      },
    });
  } finally {
    await receiver.close();
  }
});
