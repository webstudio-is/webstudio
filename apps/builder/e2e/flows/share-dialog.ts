import type { Page } from "playwright";

type ShareRole = "Viewer" | "Editor" | "Builder" | "Admin";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const getShareLinkGroup = ({ page, name }: { page: Page; name: string }) =>
  page.getByRole("group", { name: `Share link ${name}` });

const selectRole = async ({ page, role }: { page: Page; role: ShareRole }) => {
  const roleSwitch = page.getByRole("switch", { name: role });
  await roleSwitch.click();

  const startedAt = Date.now();
  while (Date.now() - startedAt < 2_000) {
    if ((await roleSwitch.getAttribute("aria-checked")) === "true") {
      return;
    }
    await delay(100);
  }

  throw new Error(`Expected ${role} share permission to be selected`);
};

export const openShareDialog = async ({ page }: { page: Page }) => {
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("dialog").getByText("Share", { exact: true }).waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

export const expectShareUnavailable = async ({ page }: { page: Page }) => {
  const shareButton = page.getByRole("button", { name: "Share" });
  if (await shareButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
    if ((await shareButton.isDisabled()) === false) {
      throw new Error("Expected Share button to be unavailable");
    }
  }
};

export const createShareLink = async ({
  page,
  name,
  role,
}: {
  page: Page;
  name: string;
  role: ShareRole;
}) => {
  const createButton = page.getByRole("button", {
    name: /Share a custom link|Add another link/,
  });
  await createButton.click();

  const customLink = getShareLinkGroup({ page, name: "Custom link" });
  await customLink.waitFor({ state: "visible", timeout: 10_000 });
  await customLink
    .getByRole("button", { name: "Menu Button for options" })
    .click();
  await selectRole({ page, role });
  await page.keyboard.press("Escape");
  await delay(500);

  await customLink
    .getByRole("button", { name: "Menu Button for options" })
    .click();
  await page.getByLabel("Name").fill(name);
  await page.keyboard.press("Enter");

  const renamedLink = getShareLinkGroup({ page, name });
  await renamedLink.waitFor({ state: "visible", timeout: 10_000 });

  // Share link updates are debounced in the UI before persisting.
  await delay(500);
};

export const copyShareLink = async ({
  page,
  name,
}: {
  page: Page;
  name: string;
}) => {
  const group = getShareLinkGroup({ page, name });
  await group.getByRole("button", { name: "Copy link" }).click();

  return await page.evaluate(async () => {
    return await navigator.clipboard.readText();
  });
};

export const updateShareLinkRole = async ({
  page,
  name,
  role,
}: {
  page: Page;
  name: string;
  role: ShareRole;
}) => {
  const group = getShareLinkGroup({ page, name });
  await group.getByRole("button", { name: "Menu Button for options" }).click();
  await selectRole({ page, role });
  await page.keyboard.press("Escape");

  // Share link updates are debounced in the UI before persisting.
  await delay(500);
};
