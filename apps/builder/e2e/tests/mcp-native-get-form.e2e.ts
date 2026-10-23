import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedPreview } from "../flows/generated-app";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";
import { test } from "../test";

const execFileAsync = promisify(execFile);

test("MCP-authored native GET form submits repeated fields to a local receiver", async ({
  page,
  context,
}) => {
  // Generate the app and run two submissions through isolated MCP clients.
  test.setTimeout(240_000);

  const requests: Array<{ method: string; url: string }> = [];
  const server = createServer((request, response) => {
    if (new URL(request.url ?? "", "http://127.0.0.1").pathname === "/search") {
      requests.push({ method: request.method ?? "", url: request.url ?? "" });
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end('<!doctype html><p id="received">Received</p>');
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected local receiver port");
  }
  const receiverUrl = `http://127.0.0.1:${address.port}/search`;

  try {
    const fixture = await createContentModeProject({
      context,
      email: "mcp-native-get-form@webstudio.test",
      title: "MCP native GET Form",
      assetNamePrefix: "mcp-native-get-form-",
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
          new URL("../fixtures/mcp-native-get-form-author.ts", import.meta.url)
        ),
        fixture.projectId,
        receiverUrl,
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
        await page.route("**/*", (route) =>
          new URL(route.request().url()).hostname === "127.0.0.1"
            ? route.continue()
            : route.abort()
        );
        await page.goto(url);
        const form = page.locator("#native-get-form");
        await expect(form).toHaveAttribute("method", "get");
        await expect(form).toHaveAttribute("action", receiverUrl);
        const invalid = await submitPreviewFormViaMcp({
          url,
          input: {
            path: "/",
            selector: "#native-get-form",
            values: [],
            submitter: 'button[type="submit"]',
            timeout: 30_000,
          },
        });
        expect(invalid.ok).toBe(true);
        expect(invalid.data).toMatchObject({
          status: "validation_failed",
          formState: "invalid",
          results: [],
          exchanges: [],
        });
        await expect(page).toHaveURL(url);
        expect(requests).toHaveLength(0);

        const submitted = await submitPreviewFormViaMcp({
          url,
          input: {
            path: "/",
            selector: "#native-get-form",
            values: [
              { name: "tag", value: "second" },
              { name: "tag", value: "first" },
            ],
            submitter: 'button[type="submit"]',
            timeout: 30_000,
          },
        });
        expect(submitted.ok).toBe(true);
        expect(submitted.data).toMatchObject({
          status: "submitted",
          results: [],
          errors: [],
          redirect: receiverUrl,
        });
        expect(submitted.data.exchanges).toEqual(
          expect.arrayContaining([expect.objectContaining({ status: 200 })])
        );
        expect(submitted.data.pageUrl).toBe(receiverUrl);
        expect(requests).toHaveLength(1);
        expect(requests[0].method).toBe("GET");
        expect(
          new URL(requests[0].url, receiverUrl).searchParams.getAll("tag")
        ).toEqual(["second", "first"]);
      },
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
