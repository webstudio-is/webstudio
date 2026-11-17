import { expect, type Page } from "@playwright/test";
import { test } from "../test";
import type { startFormQueryReceiver } from "./form-query-receiver";
import { submitPreviewFormViaMcp } from "./mcp-preview-submit";

export const expectFormQueryDelivery = async ({
  page,
  url,
  receiver,
  formId,
  resourceId,
}: {
  page: Page;
  url: string;
  receiver: Awaited<ReturnType<typeof startFormQueryReceiver>>;
  formId: string;
  resourceId: string;
}) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort()
  );
  await test.step("saved deprecated Webhook Form", async () => {
    await page.goto(url);
    const documentMarker = await page.evaluate(() => {
      const marker = crypto.randomUUID();
      (
        window as Window & { __legacyFormQueryMarker?: string }
      ).__legacyFormQueryMarker = marker;
      return marker;
    });
    const form = page.locator("#legacy-query-form");
    const output = page.locator("#legacy-query-output");
    for (const scenario of [
      {
        link: "Open legacy single query",
        path: "/legacy-query?tag=solo",
        text: "string:solo",
        tag: "solo",
        message: "Single query submission",
      },
      {
        link: "Open legacy repeated query",
        path: "/legacy-query?tag=second&tag=first&tag=second",
        text: "object:second|first|second",
        tag: "second|first|second",
        message: "Repeated query submission",
      },
    ]) {
      await page.getByRole("link", { name: scenario.link }).click();
      await expect(page).toHaveURL(new URL(scenario.path, url).href);
      await expect(output).toHaveText(scenario.text);
      await expect(form).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as Window & { __legacyFormQueryMarker?: string })
                .__legacyFormQueryMarker
          )
        )
        .toBe(documentMarker);
      const submission = await submitPreviewFormViaMcp({
        url,
        input: {
          path: scenario.path,
          selector: "#legacy-query-form",
          values: [{ name: "message", value: scenario.message }],
          submitter: 'button[type="submit"]',
          timeout: 30_000,
        },
      });
      expect(submission.ok).toBe(true);
      expect(submission.data).toMatchObject({
        status: "submitted",
        formState: "success",
        errors: [],
      });
      expect(submission.data.exchanges).toEqual(
        expect.arrayContaining([expect.objectContaining({ status: 200 })])
      );
      expect(receiver.deliveries.at(-1)).toMatchObject({
        method: "POST",
        tag: scenario.tag,
        body: { message: scenario.message },
      });
    }
    expect(receiver.deliveries).toHaveLength(2);
  });
  await test.step("managed Form Resource", async () => {
    await page.goto(url);
    const managedDocumentMarker = await page.evaluate(() => {
      const marker = crypto.randomUUID();
      (
        window as Window & { __managedFormQueryMarker?: string }
      ).__managedFormQueryMarker = marker;
      return marker;
    });
    const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
    for (const scenario of [
      {
        link: "Open single Form query",
        path: "/form-query?tag=solo",
        tag: "solo",
      },
      {
        link: "Open repeated Form query",
        path: "/form-query?tag=second&tag=first&tag=second",
        tag: ["second", "first", "second"],
      },
    ]) {
      await page.getByRole("link", { name: scenario.link }).click();
      await expect(page).toHaveURL(new URL(scenario.path, url).href);
      await expect(form).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as Window & { __managedFormQueryMarker?: string })
                .__managedFormQueryMarker
          )
        )
        .toBe(managedDocumentMarker);
      const submission = (
        await submitPreviewFormViaMcp({
          url,
          input: {
            path: scenario.path,
            selector: `[data-ws-managed-form-id="${formId}"]`,
            values: [
              { name: "name", value: "Ada" },
              { name: "email", value: "ada@example.com" },
              { name: "subject", value: "Query shape" },
              { name: "message", value: "Hello" },
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
      expect(submission.pageUrl).toBe(new URL("/form-query", url).href);
      expect(submission.results).toEqual([
        expect.objectContaining({ resourceId, status: 200 }),
      ]);
      expect(submission.exchanges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 200,
            url: expect.stringContaining("/__ws-form"),
          }),
        ])
      );
      const delivery = receiver.deliveries.at(-1);
      expect(delivery).toMatchObject({
        pathname: "/submit",
        search: "",
        method: "POST",
        contentType: expect.stringContaining("application/json"),
      });
      expect(delivery?.body).toEqual({ tag: scenario.tag });
    }
    expect(receiver.deliveries).toHaveLength(4);
  });
};
