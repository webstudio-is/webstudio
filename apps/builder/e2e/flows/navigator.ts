import type { Page } from "@playwright/test";

export const openNavigatorPanel = async ({ page }: { page: Page }) => {
  const tab = page.getByRole("tab", { name: "Navigator" });
  if ((await tab.getAttribute("aria-selected")) !== "true") {
    await tab.click();
  }
  await page.locator("[data-navigator-tree]").waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

export const selectNavigatorItem = async ({
  page,
  name,
}: {
  page: Page;
  name: string;
}) => {
  await openNavigatorPanel({ page });
  const tree = page.locator("[data-navigator-tree]");
  const item = tree
    .locator("[data-tree-button]")
    .filter({ has: page.getByText(name, { exact: true }) })
    .last();
  await item.waitFor({ state: "visible" });
  await item.click();
  await item.click();
};
