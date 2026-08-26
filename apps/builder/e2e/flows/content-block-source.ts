import type { Page } from "playwright";
import { chooseAssetByFilename } from "./assets-panel";
import { selectNavigatorItem } from "./navigator";

export const selectContentBlock = async ({ page }: { page: Page }) => {
  await selectNavigatorItem({ page, name: "Content Block" });
  await page.getByText("Content source", { exact: true }).waitFor({
    state: "visible",
    timeout: 10_000,
  });
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
  await page.getByRole("button", { name: action, exact: true }).click();
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
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Disconnect content source",
  });
  await dialog.waitFor({ state: "visible" });
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
};
