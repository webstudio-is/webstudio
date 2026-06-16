import type { Page } from "playwright";
import { chooseAssetByFilename } from "./assets-panel";
import { waitForChangeToBeSaved, waitForSyncStatus } from "./sync-status";

const getPropertyLabel = ({ page, label }: { page: Page; label: string }) =>
  page.getByText(label, { exact: true }).first();

export const fillSelectedStringProperty = async ({
  page,
  label,
  control,
  value,
}: {
  page: Page;
  label: string;
  control: "url" | "text";
  value: string;
}) => {
  await getPropertyLabel({ page, label }).waitFor({
    state: "visible",
    timeout: 10_000,
  });

  const input = getPropertyInput({ page, control });
  await input.waitFor({ state: "visible", timeout: 10_000 });

  await waitForSyncStatus({ page, status: "idle", timeout: 3_000 }).catch(
    () => undefined
  );
  const save = waitForChangeToBeSaved({ page });
  await input.fill(value);
  await input.blur();
  await save;
};

export const chooseSelectedAssetProperty = async ({
  page,
  label,
  assetLabel,
  assetFilename,
  triggerName = "Choose source",
}: {
  page: Page;
  label: string;
  assetLabel?: string;
  assetFilename?: string;
  triggerName?: string | RegExp;
}) => {
  await getPropertyLabel({ page, label }).waitFor({
    state: "visible",
    timeout: 10_000,
  });

  await waitForSyncStatus({ page, status: "idle", timeout: 3_000 }).catch(
    () => undefined
  );
  await page.getByRole("button", { name: triggerName }).click();
  const save = waitForChangeToBeSaved({ page });
  if (assetFilename !== undefined) {
    await chooseAssetByFilename({ page, filename: assetFilename });
  } else if (assetLabel !== undefined) {
    await page.getByAltText(assetLabel, { exact: true }).click();
  } else {
    throw new Error("Expected assetLabel or assetFilename");
  }
  await save;
};

const getPropertyInput = ({
  page,
  control,
}: {
  page: Page;
  control: "url" | "text";
}) =>
  control === "url"
    ? page.getByPlaceholder("https://www.url.com").first()
    : page.locator("textarea").first();

export const waitForSelectedStringPropertyValue = async ({
  page,
  label,
  control,
  value,
}: {
  page: Page;
  label: string;
  control: "url" | "text";
  value: string;
}) => {
  await getPropertyLabel({ page, label }).waitFor({
    state: "visible",
    timeout: 10_000,
  });

  const input = getPropertyInput({ page, control });
  await input.waitFor({ state: "visible", timeout: 10_000 });

  const startedAt = Date.now();
  while (Date.now() - startedAt < 10_000) {
    if ((await input.inputValue()) === value) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `Expected selected property "${label}" to have value "${value}", received "${await input.inputValue()}"`
  );
};
