import type { Page } from "playwright";
import { waitForCanvasFrame } from "./builder";
import { waitForChangeToBeSaved } from "./sync-status";

export const insertTemplateAfterCanvasText = async ({
  page,
  anchorText,
  templateName,
}: {
  page: Page;
  anchorText: string;
  templateName: string;
}) => {
  const canvas = await waitForCanvasFrame({ page });
  await canvas.getByText(anchorText).hover();

  await page
    .getByRole("button", { name: "Insert block" })
    .first()
    .click({ force: true });

  const save = waitForChangeToBeSaved({ page });
  await page.getByRole("menuitemradio", { name: templateName }).click();
  await save;
};
