import type { Page } from "playwright";
import { expectTextHidden } from "../flows/assertions";
import { openProjectBuilder } from "../flows/builder";
import {
  createFolder,
  createPageFromTemplate,
  openPage,
  openPageSettings,
  openPagesPanel,
  openTemplateSettings,
} from "../flows/pages-panel";
import { waitForSyncStatus } from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import type { SeededContentModeProject } from "../fixtures/content-mode-project";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";

let fixture: SeededContentModeProject;

const copiedPageClipboardMarker = "@webstudio/page/v0.1";

const waitForPageRow = async ({
  page,
  pageName,
}: {
  page: Page;
  pageName: string;
}) => {
  await page
    .getByRole("group", { name: `Page ${pageName}`, exact: true })
    .waitFor();
};

const waitForFolderRow = async ({
  page,
  folderName,
}: {
  page: Page;
  folderName: string;
}) => {
  await page
    .getByRole("group", { name: `Folder ${folderName}`, exact: true })
    .waitFor();
};

const waitForTemplate = async ({
  page,
  templateName,
}: {
  page: Page;
  templateName: string;
}) => {
  await page.getByText(templateName, { exact: true }).first().waitFor();
};

const waitForCopiedPageClipboard = async ({ page }: { page: Page }) => {
  await page.waitForFunction(async (marker) => {
    try {
      return (await navigator.clipboard.readText()).includes(marker as string);
    } catch {
      return false;
    }
  }, copiedPageClipboardMarker);
};

const selectHeaderAction = async ({
  page,
  menuLabel,
  action,
}: {
  page: Page;
  menuLabel: string;
  action: "Copy" | "Duplicate" | "Delete";
}) => {
  await page.getByRole("button", { name: menuLabel }).click();
  await page.getByRole("menuitem", { name: action }).click();
};

const selectContextAction = async ({
  page,
  itemName,
  action,
}: {
  page: Page;
  itemName: string;
  action: "Paste" | "Copy" | "Duplicate" | "Delete";
}) => {
  await page.getByText(itemName, { exact: true }).first().click({
    button: "right",
  });
  await page.getByRole("menuitem", { name: action }).click();
};

const pasteFromClipboardShortcut = async ({ page }: { page: Page }) => {
  await page.keyboard.press("ControlOrMeta+V");
  await waitForSyncStatus({ page, status: "idle" });
};

test.beforeAll(async () => {
  fixture = await createContentModeProject({
    email: "pages-actions-e2e@webstudio.test",
    title: "Pages Actions E2E",
    assetNamePrefix: "pages-actions-",
    editorToken: "pages-actions-e2e-editor-token",
    builderToken: "pages-actions-e2e-builder-token",
  });
});

test("Builder can copy and duplicate a page from the header menu and delete it with Backspace", async () => {
  const { page, close } = await newIsolatedPage();
  const pageName = "Actions Menu Page";
  const copiedPageName = `${pageName} (1)`;
  const duplicatedPageName = `${pageName} (1)`;

  try {
    await measure("pages actions open builder for page actions", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });

    await createPageFromTemplate({
      page,
      templateName: fixture.pageTemplateName,
      pageName,
      canvasText: fixture.pageTemplateText,
    });

    await openPageSettings({ page, pageName });
    await selectHeaderAction({
      page,
      menuLabel: "Page actions",
      action: "Copy",
    });
    await waitForCopiedPageClipboard({ page });
    await pasteFromClipboardShortcut({ page });
    await waitForPageRow({ page, pageName: copiedPageName });

    await openPage({
      page,
      pageName: copiedPageName,
      canvasText: fixture.pageTemplateText,
    });
    await page.getByText(copiedPageName, { exact: true }).first().click();
    await page.keyboard.press("Backspace");
    await page.getByRole("button", { name: "Delete Page" }).waitFor();
    await page.keyboard.press("Enter");
    await expectTextHidden({ page, text: copiedPageName });

    await openPageSettings({ page, pageName });
    await selectHeaderAction({
      page,
      menuLabel: "Page actions",
      action: "Duplicate",
    });
    await waitForPageRow({ page, pageName: duplicatedPageName });

    await openPageSettings({ page, pageName: duplicatedPageName });
    await page.keyboard.press("Backspace");
    await page.getByRole("button", { name: "Delete Page" }).waitFor();
    await page.keyboard.press("Enter");
    await expectTextHidden({ page, text: duplicatedPageName });
  } finally {
    await close();
  }
});

test("Builder can copy, duplicate, and delete a folder from the context menu", async () => {
  const { page, close } = await newIsolatedPage();
  const folderName = "Actions Menu Folder";
  const copiedFolderName = `${folderName} (1)`;
  const duplicatedFolderName = `${folderName} (2)`;

  try {
    await measure("pages actions open builder for folder actions", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });

    await createFolder({ page, folderName });

    await selectContextAction({ page, itemName: folderName, action: "Copy" });
    await waitForCopiedPageClipboard({ page });
    await selectContextAction({ page, itemName: "Home", action: "Paste" });
    await waitForSyncStatus({ page, status: "idle" });
    await waitForFolderRow({ page, folderName: copiedFolderName });

    await selectContextAction({
      page,
      itemName: folderName,
      action: "Duplicate",
    });
    await waitForFolderRow({ page, folderName: duplicatedFolderName });

    await selectContextAction({
      page,
      itemName: duplicatedFolderName,
      action: "Delete",
    });
    await page.getByRole("button", { name: "Delete" }).waitFor();
    await page.keyboard.press("Enter");
    await expectTextHidden({ page, text: duplicatedFolderName });
  } finally {
    await close();
  }
});

test("Builder can copy, duplicate, and delete a page template from actions menus", async () => {
  const { page, close } = await newIsolatedPage();
  const templateName = fixture.pageTemplateName;
  const copiedTemplateName = `${templateName} (1)`;
  const duplicatedTemplateName = `${templateName} (2)`;

  try {
    await measure(
      "pages actions open builder for template actions",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await openPagesPanel({ page });

    await openTemplateSettings({ page, templateName });
    await selectHeaderAction({
      page,
      menuLabel: "Template actions",
      action: "Copy",
    });
    await waitForCopiedPageClipboard({ page });
    await pasteFromClipboardShortcut({ page });
    await waitForTemplate({ page, templateName: copiedTemplateName });

    await openTemplateSettings({ page, templateName });
    await selectHeaderAction({
      page,
      menuLabel: "Template actions",
      action: "Duplicate",
    });
    await waitForTemplate({ page, templateName: duplicatedTemplateName });

    await selectContextAction({
      page,
      itemName: duplicatedTemplateName,
      action: "Delete",
    });
    await page.getByRole("button", { name: "Delete Template" }).waitFor();
    await page.keyboard.press("Enter");
    await expectTextHidden({ page, text: duplicatedTemplateName });
  } finally {
    await close();
  }
});
