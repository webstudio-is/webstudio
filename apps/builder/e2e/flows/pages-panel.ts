import type { Locator, Page } from "playwright";
import { expectLocatorHidden, expectTextHidden } from "./assertions";
import { waitForCanvasText } from "./builder";
import { waitForChangeToBeSaved, waitForSyncStatus } from "./sync-status";

const getPageSettingsControl = ({
  page,
  label,
}: {
  page: Page;
  label: string | RegExp;
}): Locator => {
  if (typeof label === "string") {
    return page.getByLabel(label, { exact: true });
  }
  return page.getByLabel(label);
};

export const getPageSettingsPathInput = ({ page }: { page: Page }) =>
  page.getByRole("textbox", { name: "Path", exact: true });

const fillPageSettingsControl = async ({
  page,
  label,
  value,
}: {
  page: Page;
  label: string | RegExp;
  value: string;
}) => {
  await waitForSyncStatus({ page, status: "idle", timeout: 3_000 }).catch(
    () => undefined
  );
  const control = getPageSettingsControl({ page, label });
  const save = waitForChangeToBeSaved({ page });
  await control.fill(value);
  await control.blur();
  await save;
};

export const openPagesPanel = async ({ page }: { page: Page }) => {
  const tab = page.getByRole("tab", { name: "Pages" });
  if ((await tab.getAttribute("aria-selected")) !== "true") {
    await tab.click();
  }
  await page.getByText("Pages", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

export const openPageSettings = async ({
  page,
  pageName,
}: {
  page: Page;
  pageName: string;
}) => {
  await openPagesPanel({ page });
  const pageRow = page.getByRole("group", { name: `Page ${pageName}` });
  await pageRow.hover();
  await pageRow.getByRole("button", { name: "Open page settings" }).click();
  await page.getByText("Page settings", { exact: true }).waitFor();
};

export const openPage = async ({
  page,
  pageName,
  canvasText,
}: {
  page: Page;
  pageName: string;
  canvasText: string;
}) => {
  await openPagesPanel({ page });
  await page.getByText(pageName, { exact: true }).first().click();
  await waitForCanvasText({ page, text: canvasText });
  await waitForSyncStatus({ page, status: "idle" });
};

export const createPageFromTemplate = async ({
  page,
  templateName,
  pageName,
  canvasText,
}: {
  page: Page;
  templateName: string;
  pageName: string;
  canvasText: string;
}) => {
  await openPagesPanel({ page });
  const template = page.getByText(templateName, { exact: true }).first();
  await template.scrollIntoViewIfNeeded();
  await template.hover();
  await page.getByRole("button", { name: "Create page from template" }).click();
  await page.getByText("Create page from template", { exact: true }).waitFor();

  await page.getByLabel("Page name").fill(pageName);
  const save = waitForChangeToBeSaved({ page });
  await page.getByRole("button", { name: "Create page", exact: true }).click();
  await save;

  await waitForCanvasText({ page, text: canvasText });
  await waitForSyncStatus({ page, status: "idle" });
};

export const fillPageSettingsTextField = async ({
  page,
  label,
  value,
}: {
  page: Page;
  label: string | RegExp;
  value: string;
}) => {
  await fillPageSettingsControl({ page, label, value });
};

export const fillPageSettingsUrlField = async ({
  page,
  value,
}: {
  page: Page;
  value: string;
}) => {
  const input = page.getByPlaceholder("https://www.url.com").first();
  await waitForSyncStatus({ page, status: "idle", timeout: 3_000 }).catch(
    () => undefined
  );
  const save = waitForChangeToBeSaved({ page });
  await input.fill(value);
  await input.blur();
  await save;
};

export const choosePageSettingsSocialImageAsset = async ({
  page,
  filename,
  label = filename,
}: {
  page: Page;
  filename: string;
  label?: string;
}) => {
  await waitForSyncStatus({ page, status: "idle", timeout: 3_000 }).catch(
    () => undefined
  );
  await page.getByRole("button", { name: "Choose image from assets" }).click();
  const save = waitForChangeToBeSaved({ page });
  await page.getByAltText(label, { exact: true }).click();
  await save;
  await page.getByText(filename, { exact: true }).waitFor();
};

export const fillPageSettingsTextarea = async ({
  page,
  label,
  value,
}: {
  page: Page;
  label: string | RegExp;
  value: string;
}) => {
  await fillPageSettingsControl({ page, label, value });
};

const getCustomMetadataGroup = (page: Page) =>
  page.getByRole("group", { name: "Custom metadata" });

export const fillCustomMetadata = async ({
  page,
  property,
  content,
}: {
  page: Page;
  property: string;
  content: string;
}) => {
  const metadata = getCustomMetadataGroup(page);

  await waitForSyncStatus({ page, status: "idle", timeout: 3_000 }).catch(
    () => undefined
  );
  const propertySave = waitForChangeToBeSaved({ page });
  await metadata.getByLabel("Property", { exact: true }).first().fill(property);
  await metadata.getByLabel("Property", { exact: true }).first().blur();
  await propertySave;

  await waitForSyncStatus({ page, status: "idle", timeout: 3_000 }).catch(
    () => undefined
  );
  const contentSave = waitForChangeToBeSaved({ page });
  await metadata.getByLabel("Content", { exact: true }).first().fill(content);
  await metadata.getByLabel("Content", { exact: true }).first().blur();
  await contentSave;
};

export const expectCustomMetadataValue = async ({
  page,
  property,
  content,
}: {
  page: Page;
  property: string;
  content: string;
}) => {
  const metadata = getCustomMetadataGroup(page);
  if (
    (await metadata
      .getByLabel("Property", { exact: true })
      .first()
      .inputValue()) !== property
  ) {
    throw new Error("Expected edited custom metadata property to persist");
  }
  if (
    (await metadata
      .getByLabel("Content", { exact: true })
      .first()
      .inputValue()) !== content
  ) {
    throw new Error("Expected edited custom metadata content to persist");
  }
};

export const toggleSearchVisibility = async ({ page }: { page: Page }) => {
  await waitForSyncStatus({ page, status: "idle", timeout: 3_000 }).catch(
    () => undefined
  );
  const save = waitForChangeToBeSaved({ page });
  await page.getByLabel("Exclude this page from search results").click();
  await save;
};

export const expectContentModePageSettingsRestrictions = async ({
  page,
}: {
  page: Page;
}) => {
  await expectTextHidden({ page, text: "Authentication" });
  await expectTextHidden({ page, text: "Redirect " });
  await expectTextHidden({ page, text: "Document type" });
  await expectTextHidden({ page, text: "Status code " });
  await expectTextHidden({
    page,
    text: "The plain text content served for this page.",
  });
  await expectTextHidden({ page, text: "Marketplace" });
  await expectLocatorHidden({
    locator: page.getByLabel(/Make .* the home page/),
    message: "Expected home page control to be unavailable in content mode",
  });
  await expectLocatorHidden({
    locator: page.getByRole("button", { name: "Delete page" }),
    message: "Expected page deletion to be unavailable in content mode",
  });
  await expectLocatorHidden({
    locator: page.getByRole("button", { name: "Duplicate page" }),
    message: "Expected page duplication to be unavailable in content mode",
  });
};

export const expectContentModePagePathError = async ({
  page,
}: {
  page: Page;
}) => {
  await getPageSettingsPathInput({ page }).hover();
  await page
    .getByRole("tooltip")
    .getByText("Editors can only set static page paths")
    .waitFor({ state: "visible" });
};

export const expectContentModeTemplateActionsUnavailable = async ({
  page,
  templateName,
}: {
  page: Page;
  templateName: string;
}) => {
  await openPagesPanel({ page });
  const template = page.getByText(templateName, { exact: true }).first();
  await template.scrollIntoViewIfNeeded();
  await template.hover();
  await expectLocatorHidden({
    locator: page.getByRole("button", { name: "Open template settings" }),
    message: "Expected template settings to be unavailable in content mode",
  });
};
