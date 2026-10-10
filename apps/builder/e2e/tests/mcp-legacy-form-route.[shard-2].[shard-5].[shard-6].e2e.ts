import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedPreview } from "../flows/generated-app";
import { startLegacyFormRouteReceiver } from "../flows/legacy-form-route-receiver";
import { test } from "../test";

const execFileAsync = promisify(execFile);

test("MCP-authored legacy Webhook Form action uses current dynamic route params in generated Preview", async ({
  page,
  context,
}) => {
  const receiver = await startLegacyFormRouteReceiver();
  try {
    const fixture = await createContentModeProject({
      context,
      email: "mcp-legacy-form-route@webstudio.test",
      title: "MCP legacy Form route",
      assetNamePrefix: "mcp-legacy-form-route-",
    });
    await execFileAsync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--import",
        fileURLToPath(
          new URL(
            "../../../../scripts/register-react-global.ts",
            import.meta.url
          )
        ),
        "--conditions=webstudio",
        fileURLToPath(
          new URL(
            "../fixtures/mcp-legacy-form-route-author.ts",
            import.meta.url
          )
        ),
        fixture.projectId,
        receiver.url,
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
    await withGeneratedPreview({
      projectId: fixture.projectId,
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

        await form.locator('input[name="message"]').fill("Current route");
        const responsePromise = page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            new URL(response.url()).origin === new URL(url).origin
        );
        await form.getByRole("button", { name: "Submit" }).click();
        const response = await responsePromise;
        expect(response.status()).toBe(200);
        await expect(form).toHaveAttribute("data-state", "success");
        expect(receiver.deliveries).toEqual([
          {
            method: "POST",
            slug: "second",
            routeHeader: "second",
            body: { email: "", message: "Current route" },
          },
        ]);
      },
    });
  } finally {
    await receiver.close();
  }
});
