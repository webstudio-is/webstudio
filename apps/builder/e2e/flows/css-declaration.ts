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
  await page.getByRole("button", { name: "Add styles" }).click();
  const propertyInput = page.locator(
    'input[aria-label^="Property name:"]:focus'
  );
  await propertyInput.fill(property);
  await propertyInput.press("Enter");
  const valueInput = page.locator("input:focus");
  await valueInput.fill(value);
  const save = waitForChangeToBeSaved({ page });
  await valueInput.press("Enter");
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};
