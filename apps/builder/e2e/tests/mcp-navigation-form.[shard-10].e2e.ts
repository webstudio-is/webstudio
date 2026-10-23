import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedPreview } from "../flows/generated-app";
import { test } from "../test";

const execFileAsync = promisify(execFile);

test.use({ screenshot: "off", video: "off" });

test("MCP removes Form Actions to enable client-side query navigation and refresh filtered page Resources", async ({
  page,
  context,
}) => {
  const queries: Array<Record<string, unknown>> = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://receiver.local");
    const query = { tag: url.searchParams.get("tag") };
    queries.push(query);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ query: JSON.stringify(query) }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected local search receiver port");
  }
  try {
    const fixture = await createContentModeProject({
      context,
      email: "mcp-navigation-form@webstudio.test",
      title: "MCP Navigation Form",
      assetNamePrefix: "mcp-navigation-form-",
    });
    const { stdout } = await execFileAsync(
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
          new URL("../fixtures/mcp-navigation-form-author.ts", import.meta.url)
        ),
        fixture.projectId,
        `http://127.0.0.1:${address.port}/search`,
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
    await withGeneratedPreview({
      projectId: fixture.projectId,
      callback: async ({ url }) => {
        await page.route("**/*", (route) =>
          new URL(route.request().url()).hostname === "127.0.0.1"
            ? route.continue()
            : route.abort()
        );
        await page.goto(url);
        const marker = await page.evaluate(() => {
          const value = crypto.randomUUID();
          (
            window as Window & { navigationFormMarker?: string }
          ).navigationFormMarker = value;
          return value;
        });
        const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
        await expect(form).toHaveAttribute("action", "?__webstudio__=navigate");
        let resourceSubmissions = 0;
        page.on("request", (request) => {
          if (
            new URL(request.url()).pathname.startsWith("/__ws-form") &&
            request.method() === "POST"
          ) {
            resourceSubmissions += 1;
          }
        });
        for (const tags of [["second", "first"], ["first"]]) {
          await form.locator('input[name="name"]').fill("Ada");
          await form.locator('input[name="email"]').fill("ada@example.com");
          await form.locator('input[name="subject"]').fill("Search");
          await form.locator('textarea[name="message"]').fill("Filter results");
          await form.locator('select[name="tag"]').selectOption(tags);
          await form.getByRole("button", { name: "Submit" }).click();
          await expect
            .poll(() => new URL(page.url()).searchParams.getAll("tag"))
            .toEqual(tags);
          expect(new URL(page.url()).searchParams.has("__webstudio__")).toBe(
            false
          );
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  (window as Window & { navigationFormMarker?: string })
                    .navigationFormMarker
              )
            )
            .toBe(marker);
          const expectedTag = tags.join("|");
          await expect.poll(() => queries.at(-1)?.tag).toEqual(expectedTag);
          await expect(
            page.locator("#navigation-search-results")
          ).toContainText(JSON.stringify(expectedTag));
          await expect(form).toHaveAttribute(
            "action",
            "?__webstudio__=navigate"
          );
        }
        expect(resourceSubmissions).toBe(0);
      },
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
