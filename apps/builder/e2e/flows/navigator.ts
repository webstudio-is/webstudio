import type { Page } from "playwright";

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
