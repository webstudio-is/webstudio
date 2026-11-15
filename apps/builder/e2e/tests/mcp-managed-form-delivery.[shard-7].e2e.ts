import { expect, type Page } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startFormDeliveryReceiver,
  withGeneratedFormDeliveryPreview,
} from "../flows/generated-form-delivery";
import { runFormAuthor } from "../flows/mcp-form-author";
import {
  startPreviewFormMcpClient,
  submitPreviewFormViaMcp,
} from "../flows/mcp-preview-submit";
import { test } from "../test";

const successMessage = "Thanks for contacting us. Your message has been sent.";
const errorMessage = "We could not send your message. Please try again.";

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
          document.querySelectorAll<HTMLElement>("body *")
        ).find((element) => element.textContent?.trim() === message);
        if (feedback === undefined) {
          return false;
        }
        if (position === "visible") {
          const form = feedback.closest<HTMLElement>("form");
          if (form === null) {
            return false;
          }
          form.style.position = "fixed";
          form.style.top = "16px";
          form.style.left = "16px";
          form.style.maxHeight = "calc(100vh - 32px)";
          form.style.overflow = "auto";
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
  const feedback = page.getByText(message, { exact: true });
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

test("MCP managed Form navigation, delivery, multipart, and feedback in generated Preview", async ({
  page,
  context,
}) => {
  await startPreviewFormMcpClient();
  const fixture = await createContentModeProject({
    context,
    email: "mcp-managed-form-delivery@webstudio.test",
    title: "MCP managed Form delivery",
    assetNamePrefix: "mcp-managed-form-delivery-",
    builderToken: "mcp-managed-form-delivery-builder-token",
  });
  const { stdout } = await runFormAuthor(
    "mcp-managed-form-author",
    fixture.projectId,
    "empty-action",
    "delivery",
    "multipart",
    JSON.stringify({ mode: "redirect", fail: false }),
    JSON.stringify({ mode: "redirect", fail: true })
  );
  const [empty, delivery, multipart, success, error] = stdout
    .trim()
    .split("\n")
    .map(
      (line) =>
        JSON.parse(line) as {
          formId: string;
          resourceId: string;
          successfulResourceId?: string;
        }
    );
  expect(delivery.successfulResourceId).toBeDefined();
  const receiver = await startFormDeliveryReceiver();

  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        await openLocalPreview(page, url);
        for (const { mode, message, status, formId } of [
          {
            mode: "success",
            message: successMessage,
            status: 200,
            formId: success.formId,
          },
          {
            mode: "error",
            message: errorMessage,
            status: 502,
            formId: error.formId,
          },
        ] as const) {
          await test.step(
            mode + " feedback already in viewport does not scroll",
            async () => {
              if (mode === "error") {
                await page.goto(url);
              }
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
              receiver.deliveries.splice(0);
            }
          );
        }

        await test.step("partial Action failure scrolls error feedback into view", async () => {
          await page.goto(url);
          await positionFeedback(page, errorMessage, "offscreen");
          const form = await fillForm(page, delivery.formId);
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
                resourceId: delivery.successfulResourceId,
                status: 200,
              }),
              expect.objectContaining({
                resourceId: delivery.resourceId,
                status: 503,
              }),
            ],
            errors: [
              expect.objectContaining({
                resourceId: delivery.resourceId,
                status: 503,
              }),
            ],
          });
          await expect(form).toHaveAttribute("data-state", "error");
          await expectFeedbackInsideViewport(page, errorMessage);
          await expect
            .poll(() => getScrollCalls(page))
            .toEqual([expect.stringContaining(errorMessage)]);
          expect(
            receiver.deliveries.map(({ pathname }) => pathname).sort()
          ).toEqual(["/reject", "/submit"]);
        });
        receiver.deliveries.length = 0;

        await test.step("one Action delivers and the next failure is reported", async () => {
          const submission = (
            await submitPreviewFormViaMcp({
              url,
              input: {
                path: "/",
                selector: `[data-ws-managed-form-id="${delivery.formId}"]`,
                values: [
                  { name: "name", value: "Ada" },
                  { name: "email", value: "ada@example.com" },
                  { name: "subject", value: "Delivery test" },
                  { name: "message", value: "Actual local delivery" },
                ],
                submitter: "button[type=submit]",
                timeout: 30_000,
              },
            })
          ).data;
          expect(submission).toMatchObject({
            status: "submitted",
            formState: "error",
          });
          expect(submission.results).toEqual([
            expect.objectContaining({
              resourceId: delivery.successfulResourceId,
              resourceName: "Received HTTP action",
              status: 200,
            }),
            expect.objectContaining({
              resourceId: delivery.resourceId,
              resourceName: "Blocked HTTP action",
              status: 503,
            }),
          ]);
          expect(submission.errors).toEqual(
            expect.arrayContaining([expect.objectContaining({ status: 503 })])
          );
          expect(submission.exchanges).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                status: 502,
                url: expect.stringContaining("/__ws-form"),
              }),
            ])
          );
          expect(
            receiver.deliveries.map(({ pathname }) => pathname).sort()
          ).toEqual(["/reject", "/submit"]);
          const successfulDelivery = receiver.deliveries.find(
            ({ pathname }) => pathname === "/submit"
          );
          expect(successfulDelivery).toBeDefined();
          if (successfulDelivery === undefined) {
            throw new Error("Expected the successful Form delivery");
          }
          expect(successfulDelivery).toMatchObject({ method: "POST" });
          expect(successfulDelivery.contentType).toContain("application/json");
          expect(JSON.parse(successfulDelivery.body)).toMatchObject({
            name: "Ada",
            email: "ada@example.com",
            subject: "Delivery test",
            message: "Actual local delivery",
          });
        });
        receiver.deliveries.length = 0;

        await test.step("uploaded files use multipart by default", async () => {
          const fileBytes = Buffer.from([0, 1, 127, 128, 255]);
          const submission = (
            await submitPreviewFormViaMcp({
              url,
              input: {
                path: "/",
                selector: `[data-ws-managed-form-id="${multipart.formId}"]`,
                values: [
                  { name: "name", value: "Ada" },
                  { name: "email", value: "ada@example.com" },
                  { name: "subject", value: "Multipart test" },
                  { name: "message", value: "File payload" },
                  { name: "tag", value: "red" },
                  { name: "tag", value: "blue" },
                  {
                    name: "upload",
                    file: {
                      name: "evidence.bin",
                      type: "application/octet-stream",
                      base64: fileBytes.toString("base64"),
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
          });
          expect(submission.results).toEqual(
            expect.arrayContaining([expect.objectContaining({ status: 503 })])
          );
          expect(submission.errors).toEqual(
            expect.arrayContaining([expect.objectContaining({ status: 503 })])
          );
          expect(submission.exchanges).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                status: 502,
                url: expect.stringContaining("/__ws-form"),
              }),
            ])
          );
          expect(
            receiver.deliveries.map(({ pathname }) => pathname).sort()
          ).toEqual(["/reject", "/submit"]);
          const delivered = receiver.deliveries.find(
            ({ pathname }) => pathname === "/submit"
          );
          expect(delivered).toBeDefined();
          if (delivered === undefined) {
            throw new Error("Expected the successful multipart delivery");
          }
          expect(delivered.method).toBe("POST");
          expect(delivered.contentType).toMatch(
            /^multipart\/form-data; boundary=/
          );
          const parsed = await new Request("http://127.0.0.1/submit", {
            method: "POST",
            headers: { "content-type": delivered.contentType },
            body: Uint8Array.from(delivered.bodyBytes),
          }).formData();
          expect(Array.from(parsed.keys()).sort()).toEqual(
            [
              "name",
              "email",
              "subject",
              "message",
              "tag",
              "tag",
              "upload",
            ].sort()
          );
          expect(parsed.get("name")).toBe("Ada");
          expect(parsed.get("email")).toBe("ada@example.com");
          expect(parsed.get("subject")).toBe("Multipart test");
          expect(parsed.get("message")).toBe("File payload");
          expect(parsed.getAll("tag")).toEqual(["red", "blue"]);
          const upload = parsed.get("upload");
          expect(upload).toBeInstanceOf(File);
          const uploadedFile = upload as File;
          expect(uploadedFile.name).toBe("evidence.bin");
          expect(uploadedFile.type).toBe("application/octet-stream");
          expect(Buffer.from(await uploadedFile.arrayBuffer())).toEqual(
            fileBytes
          );
        });

        await test.step("no Actions navigate with query values and no Resource POST", async () => {
          const formRequests: string[] = [];
          page.on("request", (request) => {
            if (new URL(request.url()).pathname.startsWith("/__ws-form")) {
              formRequests.push(request.url());
            }
          });
          await page.goto(url);
          const form = page.locator(
            `[data-ws-managed-form-id="${empty.formId}"]`
          );
          await form.locator('input[name="name"]').fill("Ada");
          await form.locator('input[name="email"]').fill("ada@example.com");
          await form.locator('input[name="subject"]').fill("No Action test");
          await form.locator('textarea[name="message"]').fill("No dispatch");
          await expect(form).toHaveAttribute(
            "action",
            "?__webstudio__=navigate"
          );
          await form.getByRole("button", { name: "Submit" }).click();
          await expect
            .poll(() => new URL(page.url()).searchParams.get("name"))
            .toBe("Ada");
          expect(new URL(page.url()).searchParams.get("email")).toBe(
            "ada@example.com"
          );
          expect(new URL(page.url()).searchParams.get("subject")).toBe(
            "No Action test"
          );
          expect(new URL(page.url()).searchParams.get("message")).toBe(
            "No dispatch"
          );
          expect(formRequests).toEqual([]);
        });
      },
    });
  } finally {
    await receiver.close();
  }
});
