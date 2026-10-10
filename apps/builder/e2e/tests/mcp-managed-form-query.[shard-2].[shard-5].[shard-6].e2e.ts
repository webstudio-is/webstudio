import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startFormDeliveryReceiver,
  withGeneratedFormDeliveryPreview,
} from "../flows/generated-form-delivery";
import { test } from "../test";

const execFileAsync = promisify(execFile);

test("MCP-authored managed Form Resource sends single and ordered repeated system.search values after client navigation", async ({
  page,
  context,
}) => {
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
  const { formId } = JSON.parse(stdout) as { formId: string };
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
          await form.locator('input[name="name"]').fill("Ada");
          await form.locator('input[name="email"]').fill("ada@example.com");
          await form.locator('input[name="subject"]').fill("Query shape");
          await form.locator('textarea[name="message"]').fill("Hello");
          const responsePromise = page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname.startsWith("/__ws-form") &&
              response.request().method() === "POST"
          );
          await form.getByRole("button", { name: "Submit" }).click();
          const response = await responsePromise;
          expect(response.status()).toBe(200);
          await expect(form).toHaveAttribute("data-state", "success");
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
