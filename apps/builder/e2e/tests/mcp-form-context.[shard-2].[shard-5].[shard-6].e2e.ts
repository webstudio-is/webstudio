import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedFormDeliveryPreview } from "../flows/generated-form-delivery";
import { startFormContextReceiver } from "../flows/form-context-receiver";
import { test } from "../test";

const execFileAsync = promisify(execFile);

test("MCP-authored Form Resource receives scoped submission, browser, and dynamic route values in generated Preview", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-context@webstudio.test",
    title: "MCP Form context",
    assetNamePrefix: "mcp-form-context-",
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
        new URL("../fixtures/mcp-form-context-author.ts", import.meta.url)
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
  const receiver = await startFormContextReceiver();
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
        await context.setExtraHTTPHeaders({
          "accept-language": "pt-PT",
          "user-agent": "McpFormContextE2E/1.0",
        });
        await page.goto(url);
        await page.getByRole("link", { name: "Open contact Form" }).click();
        await expect(page).toHaveURL(
          new URL("/contact/autumn?private=omit", url).href
        );
        const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
        await form.locator('input[name="name"]').fill("Ada");
        await form.locator('input[name="email"]').fill("ada@example.com");
        await form.locator('input[name="subject"]').fill("Context test");
        await form.locator('textarea[name="message"]').fill("Hello");
        const postRequests: string[] = [];
        page.on("request", (request) => {
          if (request.method() === "POST") {
            postRequests.push(request.url());
          }
        });
        const responsePromise = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith("/__ws-form") &&
            response.request().method() === "POST",
          { timeout: 5_000 }
        );
        await form.getByRole("button", { name: "Submit" }).click();
        const response = await responsePromise.catch(async (error: unknown) => {
          const validity = await form.evaluate((element: HTMLFormElement) => ({
            valid: element.checkValidity(),
            disabled: element.querySelector("button")?.disabled,
            invalid: Array.from(element.elements)
              .filter(
                (control) =>
                  control instanceof HTMLInputElement ||
                  control instanceof HTMLTextAreaElement
              )
              .filter((control) => !control.checkValidity())
              .map((control) => ({ name: control.name, value: control.value })),
          }));
          throw new Error(
            `${String(error)}; Form state=${await form.getAttribute("data-state")}; ` +
              `text=${await form.innerText()}; POSTs=${JSON.stringify(postRequests)}; ` +
              `validity=${JSON.stringify(validity)}`
          );
        });
        expect(response.status()).toBe(200);
        expect(await response.json()).toMatchObject({ success: true });
        await expect(form).toHaveAttribute("data-state", "success");
        expect(receiver.deliveries).toHaveLength(1);
        expect(receiver.deliveries[0]).toMatchObject({
          method: "POST",
          languageHeader: "pt-PT",
          body: {
            name: "Ada",
            email: "ada@example.com",
            slug: "autumn",
            browser: {
              // Local generated Preview has no trusted platform IP header.
              ip: null,
              userAgent: "McpFormContextE2E/1.0",
              language: "pt-PT",
              referrer: new URL("/contact/autumn", url).href,
            },
          },
        });
      },
    });
  } finally {
    await receiver.close();
  }
});
