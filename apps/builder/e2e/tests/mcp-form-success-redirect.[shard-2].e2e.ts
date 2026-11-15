import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startFormDeliveryReceiver,
  withGeneratedFormDeliveryPreview,
} from "../flows/generated-form-delivery";
import {
  startPreviewFormMcpClient,
  submitPreviewFormViaMcp,
} from "../flows/mcp-preview-submit";
import { measure } from "../perf";
import { test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-form-outcomes-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);
const scrollCallsKey = "mcp-form-feedback-scroll-calls";

const authorForms = async (projectId: string) => {
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
    successful: RedirectForm;
    failed: RedirectForm;
    feedback: RedirectForm;
    combination: {
      formId: string;
      graphqlResourceId: string;
      middleResourceId: string;
      httpResourceId: string;
    };
  };
};

type RedirectForm = {
  formId: string;
  resourceId: string;
  successfulResourceId?: string;
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
        document.querySelectorAll<HTMLElement>("body *")
      ).find((element) => element.textContent?.trim() === messageText);
      if (feedback === undefined) {
        return false;
      }
      const spacer = document.createElement("div");
      spacer.style.height = "1600px";
      feedback.parentNode?.insertBefore(spacer, feedback);
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

test("MCP Forms preserve action order, redirect, and feedback in generated Preview", async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await startPreviewFormMcpClient();
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-redirect-combined@webstudio.test",
    title: "MCP Form redirect outcomes",
    assetNamePrefix: "mcp-form-redirect-combined-",
    builderToken: "mcp-form-redirect-combined-builder-token",
  });
  const { successful, failed, feedback, combination } = await measure(
    "MCP author Form outcomes",
    () => authorForms(fixture.projectId)
  );
  const { formId, graphqlResourceId, middleResourceId, httpResourceId } =
    combination;
  expect(successful.successfulResourceId).toBeDefined();
  expect(failed.successfulResourceId).toBeUndefined();
  expect(feedback.successfulResourceId).toBeDefined();

  const receiver = await startFormDeliveryReceiver();
  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        await test.step("MCP Form dispatches Actions in configured result order", async () => {
          const submission = (
            await submitPreviewFormViaMcp({
              url,
              input: {
                path: "/",
                selector: `[data-ws-managed-form-id="${formId}"]`,
                values: [
                  { name: "name", value: "Ada" },
                  { name: "email", value: "ada@example.com" },
                  { name: "subject", value: "Action combination" },
                  { name: "message", value: "Two receivers" },
                ],
                submitter: "button[type=submit]",
                timeout: 30_000,
              },
            })
          ).data;
          expect(submission).toMatchObject({
            status: "submitted",
            formState: "success",
            errors: [],
          });
          expect(submission.exchanges).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                status: 200,
                url: expect.stringContaining("/__ws-form"),
              }),
            ])
          );
          expect(submission.results).toEqual([
            expect.objectContaining({
              resourceId: graphqlResourceId,
              resourceName: "First GraphQL action",
              status: 200,
            }),
            expect.objectContaining({
              resourceId: middleResourceId,
              resourceName: "Middle HTTP action",
              status: 200,
            }),
            expect.objectContaining({
              resourceId: httpResourceId,
              resourceName: "Last HTTP action",
              status: 200,
            }),
          ]);
          expect(receiver.deliveries).toHaveLength(3);
          expect(receiver.deliveries.map(({ pathname }) => pathname)).toEqual([
            "/submit",
            "/submit",
            "/submit",
          ]);
          const graphqlDelivery = receiver.deliveries.find(({ body }) =>
            body.includes("mutation Record")
          );
          const httpDelivery = receiver.deliveries.find(
            ({ body }) => !body.includes("mutation Record")
          );
          expect(graphqlDelivery).toMatchObject({ method: "POST" });
          expect(graphqlDelivery?.contentType).toContain("application/json");
          expect(JSON.parse(graphqlDelivery?.body ?? "null")).toMatchObject({
            query: "mutation Record($name: String!) { record(name: $name) }",
            variables: { name: "Ada" },
          });
          expect(httpDelivery).toMatchObject({ method: "POST" });
          expect(JSON.parse(httpDelivery?.body ?? "null")).toMatchObject({
            name: "Ada",
            email: "ada@example.com",
            subject: "Action combination",
            message: "Two receivers",
          });
          receiver.deliveries.splice(0);
        });

        for (const [name, form, fail] of [
          ["successful", successful, false],
          ["failed", failed, true],
        ] as const) {
          await test.step("MCP " + name + " Action", async () => {
            const submission = (
              await submitPreviewFormViaMcp({
                url,
                input: {
                  path: "/",
                  selector: '[data-ws-managed-form-id="' + form.formId + '"]',
                  values: [
                    { name: "name", value: "Ada" },
                    { name: "email", value: "ada@example.com" },
                    { name: "subject", value: "Redirect test" },
                    {
                      name: "message",
                      value: "MCP-authored redirect scenario",
                    },
                  ],
                  submitter: "button[type=submit]",
                  timeout: 30_000,
                },
              })
            ).data;
            expect(submission.status).toBe("submitted");
            expect(submission.results).toEqual([
              expect.objectContaining({
                resourceId: fail ? form.resourceId : form.successfulResourceId,
                status: fail ? 503 : 200,
              }),
            ]);
            expect(submission.errors).toHaveLength(fail ? 1 : 0);
            expect(submission.exchanges).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  status: fail ? 502 : 200,
                  url: expect.stringContaining("/__ws-form"),
                }),
              ])
            );
            if (fail) {
              expect(submission.formState).toBe("error");
              expect(submission.redirect).toBeUndefined();
            } else {
              expect(submission.redirect).toBe(new URL(url).origin + "/");
            }
            expect(receiver.deliveries.map(({ pathname }) => pathname)).toEqual(
              fail ? ["/reject"] : ["/submit"]
            );
            receiver.deliveries.splice(0);
          });
        }

        await test.step("browser follows success redirect without scrolling feedback", async () => {
          await openLocalPreviewOnly(page, url);
          const form = page.locator(
            '[data-ws-managed-form-id="' + successful.formId + '"]'
          );
          await moveFeedbackBelowViewport(
            page,
            "Thanks for contacting us. Your message has been sent."
          );
          await fillContactForm(form);
          const redirected = page.waitForURL(
            (target) => target.searchParams.get("mcp-e2e") === "success"
          );
          await form.getByRole("button", { name: "Submit" }).click();
          await redirected;
          expect(await getScrollCalls(page)).toEqual([]);
          expect(receiver.deliveries).toHaveLength(1);
          expect(receiver.deliveries[0]).toMatchObject({ method: "POST" });
          receiver.deliveries.splice(0);
        });

        await test.step("successful Form scrolls off-screen feedback into view", async () => {
          await page.emulateMedia({ reducedMotion: "reduce" });
          await page.goto(url);
          await page.evaluate(
            (key) => sessionStorage.setItem(key, "[]"),
            scrollCallsKey
          );
          const form = page.locator(
            '[data-ws-managed-form-id="' + feedback.formId + '"]'
          );
          const message =
            "Thanks for contacting us. Your message has been sent.";
          await moveFeedbackBelowViewport(page, message);
          await fillContactForm(form);
          await form.getByRole("button", { name: "Submit" }).click();
          await expect(form).toHaveAttribute("data-state", "success");
          await expectFeedbackInViewport(page, message);
          expect(await getScrollCalls(page)).toEqual([
            expect.objectContaining({
              text: expect.stringContaining(message),
              behavior: "instant",
            }),
          ]);
          expect(receiver.deliveries).toHaveLength(1);
          receiver.deliveries.splice(0);
        });

        await test.step("failed Form stays put and remains retryable", async () => {
          await page.goto(url);
          await page.evaluate(
            (key) => sessionStorage.setItem(key, "[]"),
            scrollCallsKey
          );
          const form = page.locator(
            '[data-ws-managed-form-id="' + failed.formId + '"]'
          );
          const message = "We could not send your message. Please try again.";
          await moveFeedbackBelowViewport(page, message);
          await fillContactForm(form);
          await form.getByRole("button", { name: "Submit" }).click();
          await expect(form).toHaveAttribute("data-state", "error");
          await expect(form.getByText(message, { exact: true })).toBeVisible();
          await expectFeedbackInViewport(page, message);
          expect(await getScrollCalls(page)).toEqual([
            expect.objectContaining({
              text: expect.stringContaining(message),
              behavior: "instant",
            }),
          ]);
          expect(new URL(page.url()).searchParams.has("mcp-e2e")).toBe(false);
          await expect
            .poll(() => receiver.deliveries.map(({ pathname }) => pathname))
            .toEqual(["/reject"]);

          await form.evaluate((element: HTMLFormElement) =>
            element.requestSubmit()
          );
          await expect.poll(() => receiver.deliveries.length).toBe(2);
          await expect(form).toHaveAttribute("data-state", "error");
          await expectFeedbackInViewport(page, message);
          expect(new URL(page.url()).searchParams.has("mcp-e2e")).toBe(false);
          expect(receiver.deliveries.map(({ pathname }) => pathname)).toEqual([
            "/reject",
            "/reject",
          ]);
          await expectFeedbackInViewport(page, message);
        });
      },
    });
  } finally {
    await receiver.close();
  }
});
