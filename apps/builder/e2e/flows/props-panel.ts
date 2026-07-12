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

export const fillSelectedNumberProperty = async ({
  page,
  label,
  value,
}: {
  page: Page;
  label: string;
  value: number;
}) => {
  const propertyLabel = getPropertyLabel({ page, label });
  await propertyLabel.waitFor({ state: "visible", timeout: 10_000 });
  const input = getNumberPropertyInput({ page, label });
  await input.waitFor({ state: "visible", timeout: 10_000 });

  const save = waitForChangeToBeSaved({ page });
  await input.fill(String(value));
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
  const imagesDialog = page.getByRole("dialog", { name: "Images" });
  if (await imagesDialog.isVisible()) {
    await page.keyboard.press("Escape");
    await imagesDialog.waitFor({
      state: "hidden",
      timeout: 10_000,
    });
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

const getNumberPropertyInput = ({
  page,
  label,
}: {
  page: Page;
  label: string;
}) =>
  getPropertyLabel({ page, label }).locator(
    "xpath=ancestor::*[.//input[@type='number']][1]//input[@type='number']"
  );

const getBooleanPropertySwitch = ({
  page,
  label,
}: {
  page: Page;
  label: string;
}) =>
  getPropertyLabel({ page, label }).locator(
    "xpath=ancestor::*[.//*[@role='switch']][1]//*[@role='switch']"
  );

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

export const waitForSelectedNumberPropertyValue = async ({
  page,
  label,
  value,
}: {
  page: Page;
  label: string;
  value: number;
}) => {
  const propertyLabel = getPropertyLabel({ page, label });
  await propertyLabel.waitFor({ state: "visible", timeout: 10_000 });
  const input = getNumberPropertyInput({ page, label });
  await input.waitFor({ state: "visible", timeout: 10_000 });
  const expected = String(value);
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10_000) {
    if ((await input.inputValue()) === expected) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `Expected selected number property "${label}" to have value "${expected}", received "${await input.inputValue()}"`
  );
};

export const setSelectedBooleanProperty = async ({
  page,
  label,
  checked,
}: {
  page: Page;
  label: string;
  checked: boolean;
}) => {
  const propertyLabel = getPropertyLabel({ page, label });
  await propertyLabel.waitFor({ state: "visible", timeout: 10_000 });
  const control = getBooleanPropertySwitch({ page, label });
  await control.waitFor({ state: "visible", timeout: 10_000 });
  if ((await control.getAttribute("aria-checked")) === String(checked)) {
    return;
  }

  const save = waitForChangeToBeSaved({ page });
  await control.click();
  await save;
};

export const waitForSelectedBooleanPropertyValue = async ({
  page,
  label,
  checked,
}: {
  page: Page;
  label: string;
  checked: boolean;
}) => {
  const propertyLabel = getPropertyLabel({ page, label });
  await propertyLabel.waitFor({ state: "visible", timeout: 10_000 });
  const control = getBooleanPropertySwitch({ page, label });
  await control.waitFor({ state: "visible", timeout: 10_000 });
  const expected = String(checked);
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10_000) {
    if ((await control.getAttribute("aria-checked")) === expected) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `Expected selected boolean property "${label}" to be ${expected}, received "${await control.getAttribute("aria-checked")}"`
  );
};

export const resetSelectedProperty = async ({
  page,
  label,
}: {
  page: Page;
  label: string;
}) => {
  const propertyLabel = getPropertyLabel({ page, label });
  const save = waitForChangeToBeSaved({ page });
  await propertyLabel.click({ modifiers: ["Alt"] });
  await save;
};
