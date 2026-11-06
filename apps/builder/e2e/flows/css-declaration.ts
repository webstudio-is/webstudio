import type { Page } from "@playwright/test";
import { waitForChangeToBeSaved, waitForSyncStatus } from "./sync-status";

export const addCssDeclaration = async ({
  page,
  property,
  value,
}: {
  page: Page;
  property: string;
  value: string;
}) => {
  const editor = page.getByRole("textbox", { name: "Styles", exact: true });
  await editor.click();
  await editor.press("ControlOrMeta+Home");
  await editor.press("ArrowDown");
  await page.keyboard.insertText(`${property}: ${value};\n`);
  const save = waitForChangeToBeSaved({ page });
  await editor.press("ControlOrMeta+Enter");
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};
