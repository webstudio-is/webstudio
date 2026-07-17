import path from "node:path";
import type { Page } from "playwright";
import { waitForChangeToBeSaved } from "./sync-status";

const assetFixturePath = (filename: string) =>
  path.join(process.cwd(), "e2e", "fixtures", "assets", filename);

const getAssetTitleLocator = ({
  page,
  filename,
}: {
  page: Page;
  filename: string;
}) => {
  const { name } = path.parse(filename);
  return page.locator(`[title^="${name}"]`).first();
};

export const openAssetsPanel = async ({ page }: { page: Page }) => {
  await page.getByRole("tab", { name: "Assets" }).click();
  await page
    .getByRole("tabpanel", { name: "Assets" })
    .getByRole("button", { name: "Upload asset" })
    .waitFor();
};

export const uploadAsset = async ({
  page,
  filename,
}: {
  page: Page;
  filename: string;
}) => {
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload asset" }).click();
  const fileChooser = await fileChooserPromise;
  const save = waitForChangeToBeSaved({ page });
  await fileChooser.setFiles(assetFixturePath(filename));
  const title = await waitForAsset({ page, filename });
  await save;
  return title;
};

export const openAssetSettings = async ({
  page,
  filename,
}: {
  page: Page;
  filename: string;
}) => {
  const asset = page.getByTitle(filename);
  await asset.hover();
  await asset
    .locator("..")
    .getByRole("button", { name: `Actions for ${filename}` })
    .click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await page.getByText("Asset settings").waitFor();
};

export const replaceSelectedAsset = async ({
  page,
  filename,
}: {
  page: Page;
  filename: string;
}) => {
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Replace asset" }).click();
  const fileChooser = await fileChooserPromise;
  const save = waitForChangeToBeSaved({ page });
  await fileChooser.setFiles(assetFixturePath(filename));
  const title = await waitForAsset({ page, filename });
  await save;
  return title;
};

export const deleteSelectedAsset = async ({
  page,
  filename,
}: {
  page: Page;
  filename: string;
}) => {
  await page.getByRole("button", { name: "Delete" }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete asset?" });
  await deleteDialog.waitFor();
  const save = waitForChangeToBeSaved({ page });
  await deleteDialog.getByRole("button", { name: "Delete" }).click();
  await page.getByTitle(filename).waitFor({ state: "hidden" });
  await save;
};

export const waitForAsset = async ({
  page,
  filename,
}: {
  page: Page;
  filename: string;
}) => {
  const asset = getAssetTitleLocator({ page, filename });
  await asset.waitFor({ state: "visible", timeout: 30_000 });
  const title = await asset.getAttribute("title");
  if (title === null) {
    throw new Error(`Expected uploaded asset ${filename} to have a title`);
  }
  return title;
};

export const chooseAssetByFilename = async ({
  page,
  filename,
}: {
  page: Page;
  filename: string;
}) => {
  const title = await waitForAsset({ page, filename });
  await page.getByAltText(title, { exact: true }).last().click();
  return title;
};
