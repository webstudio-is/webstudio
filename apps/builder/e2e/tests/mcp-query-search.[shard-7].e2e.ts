import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedPreview } from "../flows/generated-app";
import { test } from "../test";

const execFileAsync = promisify(execFile);

test("MCP-authored generated Preview preserves single and repeated system.search values after navigation", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-query-search@webstudio.test",
    title: "MCP Query Search",
    assetNamePrefix: "mcp-query-search-",
    builderToken: "mcp-query-search-builder-token",
  });
  await execFileAsync(
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
        new URL("../fixtures/mcp-query-search-author.ts", import.meta.url)
      ),
      fixture.projectId,
    ],
    {
      timeout: 30_000,
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
      await page.route("**/*", (route) => {
        const target = new URL(route.request().url());
        return target.hostname === "127.0.0.1"
          ? route.continue()
          : route.abort();
      });
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
    },
  });
});
