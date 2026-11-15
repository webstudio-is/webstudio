import type { Page } from "@playwright/test";
import { waitForCanvasFrame } from "./builder";
import { waitForChangeToBeSaved, waitForSyncComplete } from "./sync-status";

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
  waitForProjectSync = true,
}: {
  page: Page;
  anchorText: string;
  templateName: string;
  waitForProjectSync?: boolean;
}) => {
  const insertButton = await getVisibleInsertBlockButton({ page, anchorText });
  await insertButton.click();
  const template = page.getByRole("menuitemradio", { name: templateName });
  if (waitForProjectSync === false) {
    await template.click();
    return;
  }

  await waitForSyncComplete({ page });
  await Promise.all([waitForChangeToBeSaved({ page }), template.click()]);
};
