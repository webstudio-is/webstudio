import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedPreview } from "../flows/generated-app";
import { startLegacyFormQueryReceiver } from "../flows/legacy-form-query-receiver";
import { test } from "../test";

const execFileAsync = promisify(execFile);

test("MCP-authored legacy Webhook Form preserves single and repeated query bindings through navigation and submission", async ({
  page,
  context,
}) => {
  const receiver = await startLegacyFormQueryReceiver();
  try {
    const fixture = await createContentModeProject({
      context,
      email: "mcp-legacy-form-query@webstudio.test",
      title: "MCP legacy Form query",
      assetNamePrefix: "mcp-legacy-form-query-",
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
            "../fixtures/mcp-legacy-form-query-author.ts",
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
        const documentMarker = await page.evaluate(() => {
          const marker = crypto.randomUUID();
          (
            window as Window & { __legacyFormQueryMarker?: string }
          ).__legacyFormQueryMarker = marker;
          return marker;
        });
        const form = page.locator("#legacy-query-form");
        const output = page.locator("#legacy-query-output");
        for (const scenario of [
          {
            link: "Open legacy single query",
            path: "/legacy-query?tag=solo",
            text: "string:solo",
            tag: "solo",
            message: "Single query submission",
          },
          {
            link: "Open legacy repeated query",
            path: "/legacy-query?tag=second&tag=first&tag=second",
            text: "object:second|first|second",
            tag: "second|first|second",
            message: "Repeated query submission",
          },
        ]) {
          await page.getByRole("link", { name: scenario.link }).click();
          await expect(page).toHaveURL(new URL(scenario.path, url).href);
          await expect(output).toHaveText(scenario.text);
          await expect(form).toBeVisible();
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  (window as Window & { __legacyFormQueryMarker?: string })
                    .__legacyFormQueryMarker
              )
            )
            .toBe(documentMarker);
          await form.locator('input[name="message"]').fill(scenario.message);
          const responsePromise = page.waitForResponse(
            (response) =>
              response.request().method() === "POST" &&
              new URL(response.url()).origin === new URL(url).origin
          );
          await form.getByRole("button", { name: "Submit" }).click();
          const response = await responsePromise;
          expect(response.status()).toBe(200);
          await expect(form).toHaveAttribute("data-state", "success");
          expect(receiver.deliveries.at(-1)).toMatchObject({
            method: "POST",
            tag: scenario.tag,
            body: { message: scenario.message },
          });
        }
        expect(receiver.deliveries).toHaveLength(2);
      },
    });
  } finally {
    await receiver.close();
  }
});
