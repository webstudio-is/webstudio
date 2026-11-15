import { createServer } from "node:http";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedPreview } from "../flows/generated-app";
import { runFormAuthor } from "../flows/mcp-form-author";
import {
  startPreviewFormMcpClient,
  submitPreviewFormViaMcp,
} from "../flows/mcp-preview-submit";
import { test } from "../test";

test("MCP-authored managed and native Forms validate and submit in generated Preview", async ({
  page,
  context,
}) => {
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
  try {
    await startPreviewFormMcpClient();
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected local receiver port");
    }
    const receiverUrl = `http://127.0.0.1:${address.port}/search`;
    const fixture = await createContentModeProject({
      context,
      email: "mcp-preview-form@webstudio.test",
      title: "MCP Preview Forms",
      assetNamePrefix: "mcp-preview-form-",
      builderToken: "mcp-preview-form-builder-token",
    });
    const { stdout } = await runFormAuthor(
      "mcp-managed-form-author",
      fixture.projectId
    );
    const { formId } = JSON.parse(stdout) as { formId: string };
    await runFormAuthor(
      "mcp-native-get-form-author",
      fixture.projectId,
      receiverUrl
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

        await test.step("Managed Form requires fields and reports a blocked HTTP action", async () => {
          const rendered = page.locator(
            `[data-ws-managed-form-id="${formId}"]`
          );
          await rendered.getByRole("button", { name: "Submit" }).click();
          expect(
            await rendered
              .locator('input[name="name"]')
              .evaluate(
                (input: HTMLInputElement) => input.validity.valueMissing
              )
          ).toBe(true);
          const bytes = Buffer.from([0, 1, 127, 128, 255]);
          const submission = (
            await submitPreviewFormViaMcp({
              url,
              input: {
                path: "/",
                selector: `[data-ws-managed-form-id="${formId}"]`,
                values: [
                  { name: "name", value: "Ada" },
                  { name: "email", value: "ada@example.com" },
                  { name: "subject", value: "MCP Preview" },
                  { name: "message", value: "Hello from MCP" },
                  { name: "tag", value: "first tag" },
                  { name: "tag", value: "second tag" },
                  {
                    name: "upload",
                    file: {
                      name: "sample.bin",
                      type: "application/octet-stream",
                      base64: bytes.toString("base64"),
                    },
                  },
                ],
                submitter: "button[type=submit]",
                timeout: 30_000,
              },
            })
          ).data;
          expect(submission).toMatchObject({
            status: "submitted",
            formState: "error",
            results: [],
          });
          expect(submission.errors).toEqual([
            expect.objectContaining({ status: 400 }),
          ]);
          expect(submission.exchanges).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                status: 400,
                url: expect.stringContaining("/__ws-form"),
              }),
            ])
          );
        });

        await test.step("Native GET form submits repeated fields to a local receiver", async () => {
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
        });
      },
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
