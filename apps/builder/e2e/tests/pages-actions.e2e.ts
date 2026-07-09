import type { Page } from "playwright";
import { expectTextHidden } from "../flows/assertions";
import {
  openProjectBuilder,
  waitForCanvasText,
  waitForCanvasTextHidden,
} from "../flows/builder";
import {
  createFolder,
  createPageFromTemplate,
  openFolderSettings,
  openPage,
  openPageSettings,
  openPagesPanel,
  openTemplateSettings,
} from "../flows/pages-panel";
import {
  waitForChangeToBeSaved,
  waitForSyncStatus,
} from "../flows/sync-status";
import { insertTemplateAfterCanvasText } from "../flows/template-insertion";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import type { SeededContentModeProject } from "../fixtures/content-mode-project";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";
import { loadDevBuild } from "../db";

let fixture: SeededContentModeProject;

const copiedPageClipboardMarker = "@webstudio/page/v0.1";

const getPageRow = ({ page, pageName }: { page: Page; pageName: string }) =>
  page.getByRole("group", { name: `Page ${pageName}`, exact: true });

const waitForPageRow = async ({
  page,
  pageName,
}: {
  page: Page;
  pageName: string;
}) => {
  await getPageRow({ page, pageName }).waitFor();
};

const expectPageRowHidden = async ({
  page,
  pageName,
}: {
  page: Page;
  pageName: string;
}) => {
  await getPageRow({ page, pageName }).waitFor({ state: "hidden" });
};

const deletePageRowWithShortcut = async ({
  page,
  pageName,
}: {
  page: Page;
  pageName: string;
}) => {
  await openPagesPanel({ page });
  await getPageRow({ page, pageName })
    .getByRole("button", { name: pageName, exact: true })
    .press("Backspace");
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

const getDataResourceCounts = async (fixture: SeededContentModeProject) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const dataSources = JSON.parse(build.dataSources) as Array<{
    type: string;
    name: string;
    value?: { value?: unknown };
  }>;
  const resources = JSON.parse(build.resources) as Array<{
    name: string;
    control?: string;
  }>;

  return {
    staticVariables: dataSources.filter(
      (dataSource) =>
        dataSource.name === fixture.dataResourceStaticVariableName &&
        dataSource.value?.value ===
          fixture.dataResourceStaticVariableVisibleValue
    ).length,
    httpVariables: dataSources.filter(
      (dataSource) =>
        dataSource.type === "resource" &&
        dataSource.name === fixture.dataResourceHttpVariableName
    ).length,
    graphqlVariables: dataSources.filter(
      (dataSource) =>
        dataSource.type === "resource" &&
        dataSource.name === fixture.dataResourceGraphqlVariableName
    ).length,
    systemVariables: dataSources.filter(
      (dataSource) =>
        dataSource.type === "resource" &&
        dataSource.name === fixture.dataResourceSystemVariableName
    ).length,
    httpResources: resources.filter(
      (resource) =>
        resource.name === fixture.dataResourceHttpResourceLabel &&
        resource.control === undefined
    ).length,
    graphqlResources: resources.filter(
      (resource) =>
        resource.name === fixture.dataResourceGraphqlResourceLabel &&
        resource.control === "graphql"
    ).length,
    systemResources: resources.filter(
      (resource) =>
        resource.name === fixture.dataResourceSystemResourceLabel &&
        resource.control === "system"
    ).length,
  };
};

const expectDataResourceCopies = async (
  fixture: SeededContentModeProject,
  before: Awaited<ReturnType<typeof getDataResourceCounts>>
) => {
  const after = await getDataResourceCounts(fixture);
  const entries = Object.entries(after) as Array<[keyof typeof after, number]>;
  for (const [key, count] of entries) {
    if (count <= before[key]) {
      throw new Error(
        `Expected page template to copy ${key}; before ${before[key]}, after ${count}`
      );
    }
  }
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

const undoShortcut = async ({ page }: { page: Page }) => {
  await page.keyboard.press("ControlOrMeta+Z");
  await waitForSyncStatus({ page, status: "idle" });
};

const redoShortcut = async ({ page }: { page: Page }) => {
  await page.keyboard.press("ControlOrMeta+Shift+Z");
  await waitForSyncStatus({ page, status: "idle" });
};

const confirmDialogAction = async ({
  page,
  action,
}: {
  page: Page;
  action: string;
}) => {
  const button = page.getByRole("button", { name: action });
  await button.click();
  await button.waitFor({ state: "hidden" });
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

test("Builder can insert through the engine bridge, undo, redo, and reload", async () => {
  const { page, close } = await newIsolatedPage();

  try {
    await measure("pages actions open builder for engine bridge", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.editorToken,
        mode: "content",
      });
    });

    await waitForCanvasText({ page, text: "Initial content" });

    await measure("pages actions insert template through bridge", async () => {
      await insertTemplateAfterCanvasText({
        page,
        anchorText: "Initial content",
        templateName: fixture.styledHeadingTemplateName,
      });
    });
    await waitForCanvasText({
      page,
      text: fixture.styledHeadingTemplateText,
    });

    await measure("pages actions undo bridge insert", async () => {
      await undoShortcut({ page });
    });
    await waitForCanvasTextHidden({
      page,
      text: fixture.styledHeadingTemplateText,
    });

    await measure("pages actions redo bridge insert", async () => {
      await redoShortcut({ page });
    });
    await waitForCanvasText({
      page,
      text: fixture.styledHeadingTemplateText,
    });

    await measure("pages actions reload bridge insert", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.editorToken,
        mode: "content",
      });
    });
    await waitForCanvasText({
      page,
      text: fixture.styledHeadingTemplateText,
    });
  } finally {
    await close();
  }
});

test("Builder can copy and duplicate a page from the header menu and delete it with Backspace", async () => {
  const { page, close } = await newIsolatedPage();
  const pageName = "Actions Menu Page";
  const renamedPageName = "Renamed Actions Menu Page";
  const copiedPageName = `${renamedPageName} (1)`;
  const duplicatedPageName = `${renamedPageName} (2)`;

  try {
    await measure("pages actions open builder for page actions", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    const dataResourceCountsBefore = await getDataResourceCounts(fixture);

    await createPageFromTemplate({
      page,
      templateName: fixture.pageTemplateName,
      pageName,
      canvasText: fixture.pageTemplateText,
    });
    await waitForCanvasText({
      page,
      text: fixture.dataResourceStaticVariableVisibleValue,
    });
    await waitForCanvasText({
      page,
      text: "HTTP resource variable configured",
    });
    await waitForCanvasText({
      page,
      text: "GraphQL resource variable configured",
    });
    await waitForCanvasText({ page, text: "2026" });
    await expectDataResourceCopies(fixture, dataResourceCountsBefore);

    await openPageSettings({ page, pageName });
    const renameSave = waitForChangeToBeSaved({ page });
    await page.getByLabel("Page name", { exact: true }).fill(renamedPageName);
    await page.getByLabel("Page name", { exact: true }).blur();
    await renameSave;
    await waitForPageRow({ page, pageName: renamedPageName });
    await expectPageRowHidden({ page, pageName });

    await openPageSettings({ page, pageName: renamedPageName });
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

    await openPageSettings({ page, pageName: renamedPageName });
    await selectHeaderAction({
      page,
      menuLabel: "Page actions",
      action: "Duplicate",
    });
    await waitForPageRow({ page, pageName: duplicatedPageName });

    await deletePageRowWithShortcut({ page, pageName: duplicatedPageName });
    await confirmDialogAction({ page, action: "Delete Page" });
    await expectPageRowHidden({ page, pageName: duplicatedPageName });

    await measure(
      "pages actions reload for page action persistence",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await openPagesPanel({ page });
    await waitForPageRow({ page, pageName: renamedPageName });
    await expectPageRowHidden({ page, pageName });
    await waitForPageRow({ page, pageName: copiedPageName });
    await expectPageRowHidden({ page, pageName: duplicatedPageName });
    await openPage({
      page,
      pageName: renamedPageName,
      canvasText: fixture.pageTemplateText,
    });
    await waitForCanvasText({
      page,
      text: fixture.dataResourceStaticVariableVisibleValue,
    });
    await waitForCanvasText({
      page,
      text: "HTTP resource variable configured",
    });
    await waitForCanvasText({
      page,
      text: "GraphQL resource variable configured",
    });
    await waitForCanvasText({ page, text: "2026" });
    await expectDataResourceCopies(fixture, dataResourceCountsBefore);
  } finally {
    await close();
  }
});

test("Builder can copy, duplicate, and delete a folder from the context menu", async () => {
  const { page, close } = await newIsolatedPage();
  const folderName = "Actions Menu Folder";
  const renamedFolderName = "Renamed Actions Menu Folder";
  const copiedFolderName = `${renamedFolderName} (1)`;
  const duplicatedFolderName = `${renamedFolderName} (2)`;

  try {
    await measure("pages actions open builder for folder actions", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });

    await createFolder({ page, folderName });

    await openFolderSettings({ page, folderName });
    const renameSave = waitForChangeToBeSaved({ page });
    await page
      .getByLabel("Folder name", { exact: true })
      .fill(renamedFolderName);
    await page.getByLabel("Folder name", { exact: true }).blur();
    await renameSave;
    await waitForFolderRow({ page, folderName: renamedFolderName });
    await expectTextHidden({ page, text: folderName });

    await selectContextAction({
      page,
      itemName: renamedFolderName,
      action: "Copy",
    });
    await waitForCopiedPageClipboard({ page });
    await selectContextAction({ page, itemName: "Home", action: "Paste" });
    await waitForSyncStatus({ page, status: "idle" });
    await waitForFolderRow({ page, folderName: copiedFolderName });

    await selectContextAction({
      page,
      itemName: renamedFolderName,
      action: "Duplicate",
    });
    await waitForFolderRow({ page, folderName: duplicatedFolderName });

    await selectContextAction({
      page,
      itemName: duplicatedFolderName,
      action: "Delete",
    });
    await confirmDialogAction({ page, action: "Delete" });
    await expectTextHidden({ page, text: duplicatedFolderName });

    await measure(
      "pages actions reload for folder action persistence",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await openPagesPanel({ page });
    await waitForFolderRow({ page, folderName: renamedFolderName });
    await expectTextHidden({ page, text: folderName });
    await waitForFolderRow({ page, folderName: copiedFolderName });
    await openFolderSettings({ page, folderName: copiedFolderName });
    await expectTextHidden({ page, text: duplicatedFolderName });
  } finally {
    await close();
  }
});

test("Builder can copy, duplicate, and delete a page template from actions menus", async () => {
  const { page, close } = await newIsolatedPage();
  const templateName = fixture.pageTemplateName;
  const renamedTemplateName = "Renamed Content Page Template";
  const copiedTemplateName = `${renamedTemplateName} (1)`;
  const duplicatedTemplateName = `${renamedTemplateName} (2)`;

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
    const renameSave = waitForChangeToBeSaved({ page });
    await page
      .getByLabel("Template name", { exact: true })
      .fill(renamedTemplateName);
    await page.getByLabel("Template name", { exact: true }).blur();
    await renameSave;
    await waitForTemplate({ page, templateName: renamedTemplateName });

    await openTemplateSettings({ page, templateName: renamedTemplateName });
    await selectHeaderAction({
      page,
      menuLabel: "Template actions",
      action: "Copy",
    });
    await waitForCopiedPageClipboard({ page });
    await pasteFromClipboardShortcut({ page });
    await waitForTemplate({ page, templateName: copiedTemplateName });

    await openTemplateSettings({ page, templateName: renamedTemplateName });
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
    await confirmDialogAction({ page, action: "Delete Template" });
    await expectTextHidden({ page, text: duplicatedTemplateName });

    await measure(
      "pages actions reload for template action persistence",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await openPagesPanel({ page });
    await waitForTemplate({ page, templateName: renamedTemplateName });
    await waitForTemplate({ page, templateName: copiedTemplateName });
    await expectTextHidden({ page, text: duplicatedTemplateName });
  } finally {
    await close();
  }
});
