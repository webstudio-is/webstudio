import type { Page } from "playwright";
import { waitForCanvasFrame } from "./builder";
import { waitForSyncStatus } from "./sync-status";

const getVisibleInsertBlockButton = async ({
  page,
  anchorText,
}: {
  page: Page;
  anchorText: string;
}) => {
  await page.keyboard.press("Escape");
  const canvas = await waitForCanvasFrame({ page });
  const target = canvas.getByText(anchorText, { exact: true }).first();
  const button = page.getByRole("button", { name: "Insert block" }).last();
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < 10_000) {
    try {
      await target.scrollIntoViewIfNeeded();
      await target.hover();
      await button.waitFor({ state: "visible", timeout: 1_000 });
      return button;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Expected insert block button for "${anchorText}"`, {
    cause: lastError,
  });
};

export const insertTemplateAfterCanvasText = async ({
  page,
  anchorText,
  templateName,
}: {
  page: Page;
  anchorText: string;
  templateName: string;
}) => {
  const insertButton = await getVisibleInsertBlockButton({ page, anchorText });
  await insertButton.click();

  await page.getByRole("menuitemradio", { name: templateName }).click();
  await waitForSyncStatus({ page, status: "idle" });
};
