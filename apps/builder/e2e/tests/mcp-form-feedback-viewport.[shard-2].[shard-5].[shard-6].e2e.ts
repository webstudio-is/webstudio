import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, type Page } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startFormDeliveryReceiver,
  withGeneratedFormDeliveryPreview,
} from "../flows/generated-form-delivery";
import { test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);
const successMessage = "Thanks for contacting us. Your message has been sent.";
const errorMessage = "We could not send your message. Please try again.";

const authorForm = async (
  projectId: string,
  mode: "success" | "error" | "partial"
) => {
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      reactGlobalPath,
      "--conditions=webstudio",
      authorPath,
      projectId,
      JSON.stringify(
        mode === "partial"
          ? { mode: "delivery" }
          : { mode: "redirect", fail: mode === "error" }
      ),
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
  return JSON.parse(stdout) as {
    formId: string;
    resourceId: string;
    successfulResourceId?: string;
  };
};

const openLocalPreview = async (page: Page, url: string) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.assign(window, { __mcpFeedbackScrollCalls: calls });
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      calls.push(this.textContent ?? "");
      original.call(this, options);
    };
  });
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort()
  );
  await page.goto(url);
};

const positionFeedback = async (
  page: Page,
  message: string,
  position: "visible" | "offscreen"
) => {
  await page.evaluate(
    ({ message, position }) => {
      const place = () => {
        const feedback = Array.from(
          document.querySelectorAll<HTMLElement>("[data-ws-form-feedback]")
        ).find((element) => element.textContent?.includes(message));
        if (feedback === undefined) {
          return false;
        }
        if (position === "visible") {
          feedback.style.position = "fixed";
          feedback.style.top = "16px";
          feedback.style.left = "16px";
        } else {
          feedback.style.marginBlockStart = "1600px";
        }
        return true;
      };
      if (place()) {
        return;
      }
      const observer = new MutationObserver(() => {
        if (place()) {
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    },
    { message, position }
  );
};

const getScrollCalls = async (page: Page) =>
  await page.evaluate(
    () =>
      (window as Window & { __mcpFeedbackScrollCalls?: string[] })
        .__mcpFeedbackScrollCalls ?? []
  );

const expectFeedbackInsideViewport = async (page: Page, message: string) => {
  const feedback = page.locator("[data-ws-form-feedback]").filter({
    hasText: message,
  });
  await expect(feedback).toBeVisible();
  await expect
    .poll(() =>
      feedback.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          bounds.top >= 0 &&
          bounds.bottom <= window.innerHeight
        );
      })
    )
    .toBe(true);
};

const fillForm = async (page: Page, formId: string) => {
  const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
  await form.locator('input[name="name"]').fill("Ada");
  await form.locator('input[name="email"]').fill("ada@example.com");
  await form.locator('input[name="subject"]').fill("Feedback viewport");
  await form.locator('textarea[name="message"]').fill("Local Preview");
  return form;
};

for (const { mode, message, status } of [
  { mode: "success", message: successMessage, status: 200 },
  { mode: "error", message: errorMessage, status: 502 },
] as const) {
  test(`MCP-authored ${mode} feedback already in viewport does not scroll`, async ({
    page,
    context,
  }) => {
    const fixture = await createContentModeProject({
      context,
      email: `mcp-form-visible-${mode}@webstudio.test`,
      title: `MCP Form visible ${mode} feedback`,
      assetNamePrefix: `mcp-form-visible-${mode}-`,
      builderToken: `mcp-form-visible-${mode}-builder-token`,
    });
    const { formId } = await authorForm(fixture.projectId, mode);
    const receiver = await startFormDeliveryReceiver();
    try {
      await withGeneratedFormDeliveryPreview({
        projectId: fixture.projectId,
        receiverPort: receiver.port,
        callback: async ({ url }) => {
          await openLocalPreview(page, url);
          await positionFeedback(page, message, "visible");
          const form = await fillForm(page, formId);
          const submission = page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname.startsWith("/__ws-form") &&
              response.request().method() === "POST"
          );
          await form.getByRole("button", { name: "Submit" }).click();
          expect((await submission).status()).toBe(status);
          await expect(form).toHaveAttribute("data-state", mode);
          await expectFeedbackInsideViewport(page, message);
          await page.evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => resolve())
                )
              )
          );
          expect(await getScrollCalls(page)).toEqual([]);
        },
      });
    } finally {
      await receiver.close();
    }
  });
}

test("MCP-authored partial Action failure scrolls error feedback into view", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-partial-feedback@webstudio.test",
    title: "MCP Form partial Action failure feedback",
    assetNamePrefix: "mcp-form-partial-feedback-",
    builderToken: "mcp-form-partial-feedback-builder-token",
  });
  const { formId, resourceId, successfulResourceId } = await authorForm(
    fixture.projectId,
    "partial"
  );
  expect(successfulResourceId).toBeDefined();
  const receiver = await startFormDeliveryReceiver();
  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        await openLocalPreview(page, url);
        await positionFeedback(page, errorMessage, "offscreen");
        const form = await fillForm(page, formId);
        const submission = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith("/__ws-form") &&
            response.request().method() === "POST"
        );
        await form.getByRole("button", { name: "Submit" }).click();
        const response = await submission;
        expect(response.status()).toBe(502);
        expect(await response.json()).toMatchObject({
          success: false,
          results: [
            expect.objectContaining({
              resourceId: successfulResourceId,
              status: 200,
            }),
            expect.objectContaining({ resourceId, status: 503 }),
          ],
          errors: [expect.objectContaining({ resourceId, status: 503 })],
        });
        await expect(form).toHaveAttribute("data-state", "error");
        await expectFeedbackInsideViewport(page, errorMessage);
        await expect
          .poll(() => getScrollCalls(page))
          .toEqual([expect.stringContaining(errorMessage)]);
        expect(
          receiver.deliveries.map(({ pathname }) => pathname).sort()
        ).toEqual(["/reject", "/reject", "/submit"]);
      },
    });
  } finally {
    await receiver.close();
  }
});
