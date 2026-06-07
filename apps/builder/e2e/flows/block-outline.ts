import type { Page } from "playwright";
import { waitForCanvasFrame } from "./builder";
import { waitForChangeToBeSaved, waitForSyncStatus } from "./sync-status";

export const deleteContentBlockChildAfterCanvasText = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  const canvas = await waitForCanvasFrame({ page });
  await waitForSyncStatus({ page, status: "idle" });

  await page.keyboard.down("Alt");
  try {
    await canvas.getByText(text, { exact: true }).hover();
    const deleteButton = page
      .getByRole("button", { name: "Delete block" })
      .last();
    await deleteButton.waitFor({ state: "visible" });
    const save = waitForChangeToBeSaved({ page });
    await deleteButton.click();
    await save;
  } finally {
    await page.keyboard.up("Alt");
  }
};
