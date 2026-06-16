import type { Locator, Page } from "playwright";

type ShareRole = "Viewer" | "Editor" | "Builder" | "Admin";

const getShareLinkGroup = ({ page, name }: { page: Page; name: string }) =>
  page.getByRole("group", { name: `Share link ${name}` });

const getShareLinkOptions = ({ page, name }: { page: Page; name: string }) =>
  page.getByRole("dialog", { name: `Share link options ${name}` }).last();

const getCreateShareLinkButton = (page: Page) =>
  page.getByRole("button", {
    name: /Share a custom link|Add another link/,
  });

const getShareLinksRegion = (page: Page) =>
  page.getByRole("region", { name: "Share links" });

const waitForShareLinksIdle = async ({ page }: { page: Page }) => {
  await getShareLinksRegion(page).waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.waitForFunction(
    () =>
      document
        .querySelector('[role="region"][aria-label="Share links"]')
        ?.getAttribute("aria-busy") === "false",
    undefined,
    { timeout: 10_000 }
  );
};

const waitForShareLinkMutation = async ({ page }: { page: Page }) => {
  await page.waitForFunction(
    () =>
      document
        .querySelector('[role="region"][aria-label="Share links"]')
        ?.getAttribute("aria-busy") === "true",
    undefined,
    { timeout: 2_000 }
  );
  await waitForShareLinksIdle({ page });
};

const waitForShareLinksReady = async ({ page }: { page: Page }) => {
  await waitForShareLinksIdle({ page });
  await getCreateShareLinkButton(page).click({
    trial: true,
    timeout: 10_000,
  });
};

const selectRole = async ({
  options,
  role,
}: {
  options: Locator;
  role: ShareRole;
}) => {
  const checkedRoleSwitch = options.getByRole("switch", {
    name: role,
    checked: true,
  });
  if (await checkedRoleSwitch.isVisible({ timeout: 500 }).catch(() => false)) {
    return false;
  }

  const roleSwitch = options.getByRole("switch", { name: role });
  if (await roleSwitch.isDisabled()) {
    throw new Error(`Expected share-link role "${role}" to be enabled`);
  }
  await roleSwitch.click();
  return true;
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
  await waitForShareLinksIdle({ page });

  const customLink = getShareLinkGroup({ page, name: "Custom link" });
  await customLink.waitFor({ state: "visible", timeout: 10_000 });
  await customLink
    .getByRole("button", { name: "Menu Button for options" })
    .click();
  const customLinkOptions = getShareLinkOptions({
    page,
    name: "Custom link",
  });
  await customLinkOptions.getByLabel("Name").fill(name);
  await page.keyboard.press("Enter");
  await waitForShareLinkMutation({ page });

  const renamedLink = getShareLinkGroup({ page, name });
  await renamedLink.waitFor({ state: "visible", timeout: 10_000 });
  await renamedLink
    .getByRole("button", { name: "Menu Button for options" })
    .click();
  const renamedLinkOptions = getShareLinkOptions({ page, name });
  const roleChanged = await selectRole({ options: renamedLinkOptions, role });
  await renamedLink
    .getByRole("button", { name: "Menu Button for options" })
    .click();
  if (roleChanged) {
    await waitForShareLinkMutation({ page });
  }
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
  const options = getShareLinkOptions({ page, name });
  const roleChanged = await selectRole({ options, role });
  await group.getByRole("button", { name: "Menu Button for options" }).click();
  if (roleChanged) {
    await waitForShareLinkMutation({ page });
  }
  await waitForShareLinksReady({ page });
};
