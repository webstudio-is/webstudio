import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startFormDeliveryReceiver,
  withGeneratedFormDeliveryPreview,
} from "../flows/generated-form-delivery";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";
import { test } from "../test";

const execFileAsync = promisify(execFile);

test("MCP-authored managed Form Resource sends single and ordered repeated system.search values after client navigation", async ({
  page,
  context,
}) => {
  // Generate the app and run two submissions through isolated MCP clients.
  test.setTimeout(240_000);

  const fixture = await createContentModeProject({
    context,
    email: "mcp-managed-form-query@webstudio.test",
    title: "MCP managed Form query",
    assetNamePrefix: "mcp-managed-form-query-",
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
        new URL("../fixtures/mcp-managed-form-query-author.ts", import.meta.url)
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
  const { formId, resourceId } = JSON.parse(stdout) as {
    formId: string;
    resourceId: string;
  };
  const receiver = await startFormDeliveryReceiver();
  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        await page.route("**/*", (route) =>
          new URL(route.request().url()).hostname === "127.0.0.1"
            ? route.continue()
            : route.abort()
        );
        await page.goto(url);
        const documentMarker = await page.evaluate(() => {
          const marker = crypto.randomUUID();
          (
            window as Window & { __managedFormQueryMarker?: string }
          ).__managedFormQueryMarker = marker;
          return marker;
        });
        const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
        for (const scenario of [
          {
            link: "Open single Form query",
            path: "/form-query?tag=solo",
            tag: "solo",
          },
          {
            link: "Open repeated Form query",
            path: "/form-query?tag=second&tag=first&tag=second",
            tag: ["second", "first", "second"],
          },
        ]) {
          await page.getByRole("link", { name: scenario.link }).click();
          await expect(page).toHaveURL(new URL(scenario.path, url).href);
          await expect(form).toBeVisible();
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  (window as Window & { __managedFormQueryMarker?: string })
                    .__managedFormQueryMarker
              )
            )
            .toBe(documentMarker);
          const submission = (
            await submitPreviewFormViaMcp({
              url,
              input: {
                path: scenario.path,
                selector: `[data-ws-managed-form-id="${formId}"]`,
                values: [
                  { name: "name", value: "Ada" },
                  { name: "email", value: "ada@example.com" },
                  { name: "subject", value: "Query shape" },
                  { name: "message", value: "Hello" },
                ],
                submitter: "button[type=submit]",
                timeout: 30_000,
              },
            })
          ).data;
          expect(submission).toMatchObject({
            status: "submitted",
            formState: "success",
            errors: [],
          });
          expect(submission.pageUrl).toBe(new URL("/form-query", url).href);
          expect(submission.results).toEqual([
            expect.objectContaining({ resourceId, status: 200 }),
          ]);
          expect(submission.exchanges).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                status: 200,
                url: expect.stringContaining("/__ws-form"),
              }),
            ])
          );
          const delivery = receiver.deliveries.at(-1);
          expect(delivery).toMatchObject({
            pathname: "/submit",
            method: "POST",
            contentType: expect.stringContaining("application/json"),
          });
          expect(JSON.parse(delivery?.body ?? "null")).toEqual({
            tag: scenario.tag,
          });
        }
        expect(receiver.deliveries).toHaveLength(2);
      },
    });
  } finally {
    await receiver.close();
  }
});
