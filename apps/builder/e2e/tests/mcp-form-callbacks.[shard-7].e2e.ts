import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { startFormCallbackReceiver } from "../flows/form-callback-receiver";
import { withGeneratedPreview } from "../flows/generated-app";
import { runFormAuthor } from "../flows/mcp-form-author";
import {
  startPreviewFormMcpClient,
  submitPreviewFormViaMcp,
} from "../flows/mcp-preview-submit";
import { test } from "../test";

const managedPath = "/managed-callbacks";

test("Generated Preview runs legacy and managed Form callbacks and preserves query values", async ({
  page,
  context,
}) => {
  await startPreviewFormMcpClient();
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-callbacks@webstudio.test",
    title: "MCP Form callbacks",
    assetNamePrefix: "mcp-form-callbacks-",
  });
  const receiver = await startFormCallbackReceiver();
  try {
    await runFormAuthor(
      "mcp-form-callbacks-author",
      fixture.projectId,
      "legacy-and-managed",
      "https://mcp-delivery.example/submit",
      managedPath
    );
    await withGeneratedPreview({
      projectId: fixture.projectId,
      evaluationReceiverPort: String(receiver.port),
      callback: async ({ url }) => {
        await page.route("**/*", (route) =>
          new URL(route.request().url()).hostname === "127.0.0.1"
            ? route.continue()
            : route.abort()
        );
        await test.step("legacy Form callbacks report success, failure, and recovery", async () => {
          await page.goto(url);
          const form = page.locator("#callback-form");
          const audit = page.locator("#callback-audit");
          await expect(audit).toHaveText(
            "state=initial;history=;results=0;errors=0;status=0"
          );
          const history: string[] = [];
          for (const outcome of ["success", "failure", "success"] as const) {
            await form.locator('input[name="outcome"]').fill(outcome);
            const responsePromise = page.waitForResponse(
              (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).origin === new URL(url).origin
            );
            await form
              .getByRole("button", { name: "Submit callback form" })
              .click();
            const response = await responsePromise;
            const state = outcome === "success" ? "success" : "error";
            history.push(state);
            const renderedHistory = "|" + history.join("|");
            await expect(form).toHaveAttribute("data-state", state);
            expect(response.status()).toBe(200);
            await expect(audit).toHaveText(
              `state=${state};history=${renderedHistory};results=0;errors=0;status=0`
            );
            if (outcome === "failure") {
              // Legacy Fetcher submissions use React Router's streamed data envelope.
              expect(await response.text()).toContain("Service Unavailable");
            }
          }
          expect(receiver.deliveries).toEqual([
            { outcome: "success" },
            { outcome: "failure" },
            { outcome: "success" },
          ]);
        });
        receiver.deliveries.length = 0;

        await test.step("managed MCP submissions report success, failure, and recovery", async () => {
          for (const outcome of ["success", "failure", "success"] as const) {
            const submission = (
              await submitPreviewFormViaMcp({
                url,
                input: {
                  path: managedPath,
                  selector: "#callback-form",
                  values: [{ name: "outcome", value: outcome }],
                  submitter: "button[type=submit]",
                  timeout: 30_000,
                },
              })
            ).data;
            expect(submission).toMatchObject({
              status: "submitted",
              formState: outcome === "success" ? "success" : "error",
            });
            expect(submission.results).toEqual([
              expect.objectContaining({
                status: outcome === "success" ? 200 : 503,
              }),
            ]);
            expect(submission.errors).toHaveLength(
              outcome === "success" ? 0 : 1
            );
            expect(submission.exchanges).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  status: outcome === "success" ? 200 : 502,
                  url: expect.stringContaining("/__ws-form"),
                }),
              ])
            );
          }
          expect(receiver.deliveries).toEqual([
            { outcome: "success" },
            { outcome: "failure" },
            { outcome: "success" },
          ]);
        });
        receiver.deliveries.length = 0;

        await test.step("managed Form callbacks update same-page history and feedback", async () => {
          await page.goto(new URL(managedPath, url).href);
          const form = page.locator("#callback-form");
          const audit = page.locator("#callback-audit");
          const error = page.locator("#callback-error");
          await expect(audit).toHaveText(
            "state=initial;history=;results=0;errors=0;status=0"
          );
          const history: string[] = [];
          for (const outcome of ["success", "failure", "success"] as const) {
            await form.locator('input[name="outcome"]').fill(outcome);
            await form
              .getByRole("button", { name: "Submit callback form" })
              .click();
            const state = outcome === "success" ? "success" : "error";
            history.push("initial", state);
            await expect(form).toHaveAttribute("data-state", state);
            await expect(audit).toHaveText(
              `state=${state};history=|${history.join("|")};results=1;errors=${outcome === "success" ? 0 : 1};status=${outcome === "success" ? 200 : 503}`
            );
            await expect(error).toHaveText(
              outcome === "success" ? "no errors" : "Service Unavailable"
            );
          }
          expect(receiver.deliveries).toEqual([
            { outcome: "success" },
            { outcome: "failure" },
            { outcome: "success" },
          ]);
        });

        await test.step("single and repeated system.search values survive same-document navigation", async () => {
          await page.goto(url);
          const documentMarker = await page.evaluate(() => {
            const marker = crypto.randomUUID();
            (
              window as Window & { __mcpNavigationMarker?: string }
            ).__mcpNavigationMarker = marker;
            return marker;
          });
          await page.getByRole("link", { name: "Open single query" }).click();
          await expect(page).toHaveURL(new URL("/query?tag=solo", url).href);
          await expect(page.locator("#query-output")).toHaveText("string:solo");
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  (window as Window & { __mcpNavigationMarker?: string })
                    .__mcpNavigationMarker
              )
            )
            .toBe(documentMarker);

          await page.getByRole("link", { name: "Open repeated query" }).click();
          await expect(page).toHaveURL(
            new URL("/query?tag=second&tag=first&tag=second", url).href
          );
          await expect(page.locator("#query-output")).toHaveText(
            "object:second|first|second"
          );
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  (window as Window & { __mcpNavigationMarker?: string })
                    .__mcpNavigationMarker
              )
            )
            .toBe(documentMarker);

          await page.getByRole("link", { name: "Open single query" }).click();
          await expect(page).toHaveURL(new URL("/query?tag=solo", url).href);
          await expect(page.locator("#query-output")).toHaveText("string:solo");
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  (window as Window & { __mcpNavigationMarker?: string })
                    .__mcpNavigationMarker
              )
            )
            .toBe(documentMarker);
        });
      },
    });
  } finally {
    await receiver.close();
  }
});
