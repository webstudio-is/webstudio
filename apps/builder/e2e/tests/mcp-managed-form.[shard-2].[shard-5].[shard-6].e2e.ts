import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedPreview } from "../flows/generated-app";
import { test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);

test("MCP-authored Form submits in generated Preview with captured FormData and error feedback", async ({
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
  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const destination = new URL(
        input instanceof Request ? input.url : String(input),
        location.href
      );
      const body = init?.body;
      if (
        destination.pathname.startsWith("/__ws-form") &&
        body instanceof FormData
      ) {
        const upload = body.get("upload");
        (window as Window & { __mcpSubmitCount?: number }).__mcpSubmitCount =
          ((window as Window & { __mcpSubmitCount?: number })
            .__mcpSubmitCount ?? 0) + 1;
        (
          window as Window & {
            __mcpFormData?: Record<string, string[] | number[] | string>;
          }
        ).__mcpFormData = {
          name: body.getAll("name").map(String),
          email: body.getAll("email").map(String),
          subject: body.getAll("subject").map(String),
          message: body.getAll("message").map(String),
          tags: body.getAll("tag").map(String),
          fileName: upload instanceof File ? upload.name : "",
          fileBytes:
            upload instanceof File
              ? Array.from(new Uint8Array(await upload.arrayBuffer()))
              : [],
        };
      }
      return originalFetch(input, init);
    };
  });
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
      expect(
        await page.evaluate(
          () =>
            (window as Window & { __mcpSubmitCount?: number })
              .__mcpSubmitCount ?? 0
        )
      ).toBe(0);
      await rendered.locator('input[name="name"]').fill("Ada");
      await rendered.locator('input[name="email"]').fill("ada@example.com");
      await rendered.locator('input[name="subject"]').fill("MCP Preview");
      await rendered.locator('textarea[name="message"]').fill("Hello from MCP");
      await rendered.locator('input[name="tag"]').nth(0).fill("first tag");
      await rendered.locator('input[name="tag"]').nth(1).fill("second tag");
      const bytes = Buffer.from([0, 1, 127, 128, 255]);
      await rendered.locator('input[name="upload"]').setInputFiles({
        name: "sample.bin",
        mimeType: "application/octet-stream",
        buffer: bytes,
      });
      const responsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname.startsWith("/__ws-form") &&
          response.request().method() === "POST"
      );
      await rendered.getByRole("button", { name: "Submit" }).click();
      const response = await responsePromise;
      const submission = await response.json();
      expect(response.status()).toBe(400);
      expect(submission).toEqual({
        success: false,
        status: 400,
        results: [],
        errors: [
          {
            status: 400,
            body: null,
            message: "Resource destination is not allowed",
          },
        ],
      });
      await expect(rendered).toHaveAttribute("data-state", "error");
      await expect(
        rendered.getByText(
          "We could not send your message. Please try again.",
          {
            exact: true,
          }
        )
      ).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as Window & { __mcpFormData?: unknown }).__mcpFormData
          )
        )
        .toEqual({
          name: ["Ada"],
          email: ["ada@example.com"],
          subject: ["MCP Preview"],
          message: ["Hello from MCP"],
          tags: ["first tag", "second tag"],
          fileName: "sample.bin",
          fileBytes: Array.from(bytes),
        });
      expect(
        await page.evaluate(
          () =>
            (window as Window & { __mcpSubmitCount?: number }).__mcpSubmitCount
        )
      ).toBe(1);
    },
  });
});
