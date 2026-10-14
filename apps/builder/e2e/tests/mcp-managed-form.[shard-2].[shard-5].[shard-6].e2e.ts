import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedPreview } from "../flows/generated-app";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";
import { test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);

test("MCP-authored Form validates required fields and reports submission errors in generated Preview", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-preview-form@webstudio.test",
    title: "MCP Preview Form",
    assetNamePrefix: "mcp-preview-form-",
    builderToken: "mcp-preview-form-builder-token",
  });
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      reactGlobalPath,
      "--conditions=webstudio",
      authorPath,
      fixture.projectId,
    ],
    {
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: fileURLToPath(
          new URL(
            "../../../../packages/cli/tsconfig.local.json",
            import.meta.url
          )
        ),
      },
      timeout: 60_000,
    }
  );
  const { formId } = JSON.parse(stdout) as { formId: string };
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
      const rendered = page.locator(`[data-ws-managed-form-id="${formId}"]`);
      await rendered.getByRole("button", { name: "Submit" }).click();
      expect(
        await rendered
          .locator('input[name="name"]')
          .evaluate((input: HTMLInputElement) => input.validity.valueMissing)
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
    },
  });
});
