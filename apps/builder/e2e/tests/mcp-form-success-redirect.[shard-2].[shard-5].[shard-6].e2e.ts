import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
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
const successRedirect = "?mcp-e2e=success";
const scrollCallsKey = "mcp-form-feedback-scroll-calls";

const authorRedirectForm = async (
  projectId: string,
  fail: boolean,
  redirect: string | null = successRedirect
): Promise<{
  formId: string;
  resourceId: string;
  successfulResourceId?: string;
}> => {
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
      JSON.stringify({
        mode: "redirect",
        successRedirect: redirect ?? undefined,
        fail,
      }),
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

const fillContactForm = async (form: import("@playwright/test").Locator) => {
  await form.locator('input[name="name"]').fill("Ada");
  await form.locator('input[name="email"]').fill("ada@example.com");
  await form.locator('input[name="subject"]').fill("Redirect test");
  await form
    .locator('textarea[name="message"]')
    .fill("MCP-authored redirect scenario");
};

const openLocalPreviewOnly = async (
  page: import("@playwright/test").Page,
  url: string
) => {
  await page.addInitScript((key) => {
    if (sessionStorage.getItem(key) === null) {
      sessionStorage.setItem(key, "[]");
    }
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      const calls = JSON.parse(sessionStorage.getItem(key) ?? "[]") as Array<{
        text: string;
        behavior?: ScrollBehavior;
      }>;
      calls.push({
        text: this.textContent ?? "",
        behavior:
          typeof options === "object" && options !== null
            ? options.behavior
            : undefined,
      });
      sessionStorage.setItem(key, JSON.stringify(calls));
      original.call(this, options);
    };
  }, scrollCallsKey);
  await page.route("**/*", (route) => {
    const target = new URL(route.request().url());
    return target.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
  await page.goto(url);
};

const moveFeedbackBelowViewport = async (
  page: import("@playwright/test").Page,
  text: string
) => {
  await page.evaluate((messageText) => {
    const moveFeedback = () => {
      const feedback = Array.from(
        document.querySelectorAll<HTMLElement>("[data-ws-form-feedback]")
      ).find((element) => element.textContent?.includes(messageText));
      if (feedback === undefined) {
        return false;
      }
      feedback.style.marginBlockStart = "1600px";
      (
        window as Window & { __mcpFeedbackPositioned?: boolean }
      ).__mcpFeedbackPositioned = true;
      return true;
    };
    if (moveFeedback()) {
      return;
    }
    const observer = new MutationObserver(() => {
      if (moveFeedback()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, text);
};

const getScrollCalls = async (page: import("@playwright/test").Page) =>
  await page.evaluate(
    (key) =>
      JSON.parse(sessionStorage.getItem(key) ?? "[]") as Array<{
        text: string;
        behavior?: ScrollBehavior;
      }>,
    scrollCallsKey
  );

const expectFeedbackInViewport = async (
  page: import("@playwright/test").Page,
  text: string
) => {
  const feedback = page.getByText(text, { exact: true });
  await expect(feedback).toBeVisible();
  const getFeedbackState = () =>
    feedback.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const calls = JSON.parse(
        sessionStorage.getItem("mcp-form-feedback-scroll-calls") ?? "[]"
      ) as unknown[];
      return {
        visible:
          bounds.width > 0 &&
          bounds.height > 0 &&
          bounds.top >= 0 &&
          bounds.bottom <= window.innerHeight,
        tagName: element.tagName,
        display: window.getComputedStyle(element).display,
        top: bounds.top,
        bottom: bounds.bottom,
        viewportHeight: window.innerHeight,
        scrollY: window.scrollY,
        positioned: Boolean(
          (window as Window & { __mcpFeedbackPositioned?: boolean })
            .__mcpFeedbackPositioned
        ),
        calls,
      };
    });
  try {
    await expect.poll(getFeedbackState).toMatchObject({ visible: true });
  } catch (cause) {
    throw new Error(
      `Feedback did not enter viewport: ${JSON.stringify(await getFeedbackState())}`,
      { cause }
    );
  }
};

test("MCP-authored successful Form submission follows success redirect", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-redirect-success@webstudio.test",
    title: "MCP Form redirect success",
    assetNamePrefix: "mcp-form-redirect-success-",
    builderToken: "mcp-form-redirect-success-builder-token",
  });
  const { formId, successfulResourceId } = await authorRedirectForm(
    fixture.projectId,
    false
  );
  expect(successfulResourceId).toBeDefined();
  const receiver = await startFormDeliveryReceiver();
  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        await openLocalPreviewOnly(page, url);
        const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
        await moveFeedbackBelowViewport(
          page,
          "Thanks for contacting us. Your message has been sent."
        );
        await fillContactForm(form);
        const submission = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith("/__ws-form") &&
            response.request().method() === "POST"
        );
        const redirected = page.waitForURL(
          (target) => target.searchParams.get("mcp-e2e") === "success"
        );
        await form.getByRole("button", { name: "Submit" }).click();
        const response = await submission;
        expect(response.status()).toBe(200);
        await redirected;
        expect(await getScrollCalls(page)).toEqual([]);
        expect(receiver.deliveries).toHaveLength(1);
        expect(receiver.deliveries[0]).toMatchObject({ method: "POST" });
      },
    });
  } finally {
    await receiver.close();
  }
});

test("MCP-authored successful Form scrolls off-screen feedback into view", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-feedback-success@webstudio.test",
    title: "MCP Form feedback success",
    assetNamePrefix: "mcp-form-feedback-success-",
    builderToken: "mcp-form-feedback-success-builder-token",
  });
  const { formId, successfulResourceId } = await authorRedirectForm(
    fixture.projectId,
    false,
    null
  );
  expect(successfulResourceId).toBeDefined();
  const receiver = await startFormDeliveryReceiver();
  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        await openLocalPreviewOnly(page, url);
        const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
        const message = "Thanks for contacting us. Your message has been sent.";
        await moveFeedbackBelowViewport(page, message);
        await fillContactForm(form);
        const submission = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith("/__ws-form") &&
            response.request().method() === "POST"
        );
        await form.getByRole("button", { name: "Submit" }).click();
        const response = await submission;
        expect(response.status()).toBe(200);
        await expect(form).toHaveAttribute("data-state", "success");
        await expectFeedbackInViewport(page, message);
        expect(await getScrollCalls(page)).toEqual([
          expect.objectContaining({ text: expect.stringContaining(message) }),
        ]);
        expect(receiver.deliveries).toHaveLength(1);
      },
    });
  } finally {
    await receiver.close();
  }
});

test("MCP-authored failed Action keeps the Form in place despite success redirect", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-redirect-failure@webstudio.test",
    title: "MCP Form redirect failure",
    assetNamePrefix: "mcp-form-redirect-failure-",
    builderToken: "mcp-form-redirect-failure-builder-token",
  });
  const { formId, resourceId, successfulResourceId } = await authorRedirectForm(
    fixture.projectId,
    true
  );
  expect(successfulResourceId).toBeUndefined();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const receiver = await startFormDeliveryReceiver();
  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        await openLocalPreviewOnly(page, url);
        const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
        const feedback = "We could not send your message. Please try again.";
        await moveFeedbackBelowViewport(page, feedback);
        await fillContactForm(form);
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
              resourceId,
              status: 503,
              body: { error: "Temporary local E2E failure" },
            }),
          ],
          errors: [
            expect.objectContaining({
              resourceId,
              status: 503,
              body: { error: "Temporary local E2E failure" },
            }),
          ],
        });
        await expect(form).toHaveAttribute("data-state", "error");
        await expect(form.getByText(feedback, { exact: true })).toBeVisible();
        await expectFeedbackInViewport(page, feedback);
        expect(await getScrollCalls(page)).toEqual([
          expect.objectContaining({
            text: expect.stringContaining(feedback),
            behavior: "instant",
          }),
        ]);
        expect(new URL(page.url()).searchParams.has("mcp-e2e")).toBe(false);
        expect(receiver.deliveries.map(({ pathname }) => pathname)).toEqual([
          "/reject",
          "/reject",
        ]);

        const secondSubmission = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith("/__ws-form") &&
            response.request().method() === "POST"
        );
        await form.evaluate((element: HTMLFormElement) =>
          element.requestSubmit()
        );
        const secondResponse = await secondSubmission;
        expect(secondResponse.status()).toBe(502);
        await expect(form).toHaveAttribute("data-state", "error");
        expect(await getScrollCalls(page)).toHaveLength(1);
        expect(receiver.deliveries.map(({ pathname }) => pathname)).toEqual([
          "/reject",
          "/reject",
          "/reject",
          "/reject",
        ]);
        await expectFeedbackInViewport(page, feedback);
      },
    });
  } finally {
    await receiver.close();
  }
});
