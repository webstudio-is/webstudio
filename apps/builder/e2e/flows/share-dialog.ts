import type { Page } from "playwright";

type ShareRole = "Viewer" | "Editor" | "Builder" | "Admin";

const getShareLinkGroup = ({ page, name }: { page: Page; name: string }) =>
  page.getByRole("group", { name: `Share link ${name}` });

const getCreateShareLinkButton = (page: Page) =>
  page.getByRole("button", {
    name: /Share a custom link|Add another link/,
  });

const waitForShareLinksReady = async ({ page }: { page: Page }) => {
  await getCreateShareLinkButton(page).click({
    trial: true,
    timeout: 10_000,
  });
};

const selectRole = async ({ page, role }: { page: Page; role: ShareRole }) => {
  const roleSwitch = page.getByRole("switch", { name: role });
  await roleSwitch.click();
  await page
    .getByRole("switch", { name: role, checked: true })
    .waitFor({ timeout: 2_000 });
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
  await waitForShareLinksReady({ page });
  const createButton = getCreateShareLinkButton(page);
  await createButton.click();

  const customLink = getShareLinkGroup({ page, name: "Custom link" });
  await customLink.waitFor({ state: "visible", timeout: 10_000 });
  await customLink
    .getByRole("button", { name: "Menu Button for options" })
    .click();
  await selectRole({ page, role });
  await page.keyboard.press("Escape");

  await customLink
    .getByRole("button", { name: "Menu Button for options" })
    .click();
  await page.getByLabel("Name").fill(name);
  await page.keyboard.press("Enter");

  const renamedLink = getShareLinkGroup({ page, name });
  await renamedLink.waitFor({ state: "visible", timeout: 10_000 });
  await waitForShareLinksReady({ page });
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
  await waitForShareLinksReady({ page });
};
