import type { Page } from "@playwright/test";
import { chooseAssetByFilename } from "./assets-panel";
import { selectNavigatorItem } from "./navigator";

export const selectContentBlock = async ({ page }: { page: Page }) => {
  await selectNavigatorItem({ page, name: "Content Block" });
  await page
    .getByRole("button", { name: /^(Connect \.mdx file|Open)$/ })
    .first()
    .waitFor({ state: "visible", timeout: 10_000 });
};

export const chooseContentBlockSource = async ({
  page,
  filename,
  action = "Choose file",
}: {
  page: Page;
  filename: string;
  action?: "Choose file" | "Switch file";
}) => {
  if (action === "Choose file") {
    await page
      .getByRole("button", { name: "Connect .mdx file", exact: true })
      .click();
  } else {
    await page
      .locator('[aria-label="Content source actions"] button')
      .first()
      .click();
  }
  await chooseAssetByFilename({ page, filename });
};

export const confirmContentBlockConnection = async ({
  page,
}: {
  page: Page;
}) => {
  const dialog = page.getByRole("dialog", { name: /content source$/i });
  await dialog.waitFor({ state: "visible" });
  await dialog.getByRole("button", { name: "Connect", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
};

export const disconnectContentBlockSource = async ({
  page,
}: {
  page: Page;
}) => {
  await page
    .getByRole("button", { name: "Source", exact: true })
    .click({ modifiers: ["Alt"] });
};
