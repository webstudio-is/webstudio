import type { Page } from "playwright";
import { expectTextHidden } from "../flows/assertions";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { expectGeneratedAppBuild } from "../flows/generated-app";
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
import { createContentModeProject } from "../fixtures/content-mode-suite";
import type { SeededContentModeProject } from "../fixtures/content-mode-project";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";
import { loadDevBuild } from "../db";

let fixture: SeededContentModeProject;
let pasteFixture: SeededContentModeProject;

const copiedPageTransferMarker = "@webstudio/page/v0.1";

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

const waitForCopiedPageTransferData = async ({ page }: { page: Page }) => {
  await page.waitForFunction(async (marker) => {
    try {
      return (await navigator.clipboard.readText()).includes(marker as string);
    } catch {
      return false;
    }
  }, copiedPageTransferMarker);
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
  action:
    | "Copy"
    | "Duplicate"
    | "Delete"
    | "Mark as draft"
    | "Stage for publish";
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
  pasteFixture = await createContentModeProject({
    email: "pages-actions-paste-e2e@webstudio.test",
    title: "Pages Actions Paste E2E",
    assetNamePrefix: "pages-actions-paste-",
    editorToken: "pages-actions-paste-e2e-editor-token",
    builderToken: "pages-actions-paste-e2e-builder-token",
  });
});

test("Builder can draft, stage, copy, duplicate, and delete a page from the header menu", async () => {
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
    await measure(
      "pages actions generated app build for copied resources",
      async () => {
        await expectGeneratedAppBuild({ projectId: fixture.projectId });
      }
    );

    await openPageSettings({ page, pageName });
    const renameSave = waitForChangeToBeSaved({ page });
    await page.getByLabel("Page name", { exact: true }).fill(renamedPageName);
    await page.getByLabel("Page name", { exact: true }).blur();
    await renameSave;
    await waitForPageRow({ page, pageName: renamedPageName });
    await expectPageRowHidden({ page, pageName });

    const draftSave = waitForChangeToBeSaved({ page });
    await selectHeaderAction({
      page,
      menuLabel: "Page actions",
      action: "Mark as draft",
    });
    await draftSave;
    await waitForPageRow({ page, pageName: `[Draft] ${renamedPageName}` });

    await openPageSettings({
      page,
      pageName: `[Draft] ${renamedPageName}`,
    });
    await page
      .getByText(
        "Stage this page for publish before setting it as the home page"
      )
      .waitFor();
    const stageSave = waitForChangeToBeSaved({ page });
    await selectHeaderAction({
      page,
      menuLabel: "Page actions",
      action: "Stage for publish",
    });
    await stageSave;
    await waitForPageRow({ page, pageName: renamedPageName });

    await openPageSettings({ page, pageName: renamedPageName });
    await selectHeaderAction({
      page,
      menuLabel: "Page actions",
      action: "Copy",
    });
    await waitForCopiedPageTransferData({ page });
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

    await openPageSettings({ page, pageName: duplicatedPageName });
    await selectHeaderAction({
      page,
      menuLabel: "Page actions",
      action: "Delete",
    });
    const deleteSave = waitForChangeToBeSaved({ page });
    await confirmDialogAction({ page, action: "Delete Page" });
    await deleteSave;
    await waitForSyncStatus({ page, status: "idle" });
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
    await waitForCopiedPageTransferData({ page });
    const pasteSave = waitForChangeToBeSaved({ page });
    await selectContextAction({ page, itemName: "Home", action: "Paste" });
    await pasteSave;
    await waitForFolderRow({ page, folderName: copiedFolderName });

    const duplicateSave = waitForChangeToBeSaved({ page });
    await selectContextAction({
      page,
      itemName: renamedFolderName,
      action: "Duplicate",
    });
    await duplicateSave;
    await waitForFolderRow({ page, folderName: duplicatedFolderName });

    await selectContextAction({
      page,
      itemName: duplicatedFolderName,
      action: "Delete",
    });
    const deleteSave = waitForChangeToBeSaved({ page });
    await confirmDialogAction({ page, action: "Delete" });
    await deleteSave;
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
    await waitForCopiedPageTransferData({ page });
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
    const deleteSave = waitForChangeToBeSaved({ page });
    await confirmDialogAction({ page, action: "Delete Template" });
    await deleteSave;
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

const createInstanceTransfer = ({ id, text }: { id: string; text: string }) =>
  JSON.stringify({
    "@webstudio/instance/v0.1": {
      instanceSelector: [id, "source-body"],
      children: [{ type: "id", value: id }],
      instances: [
        {
          type: "instance",
          id,
          component: "ws:element",
          tag: "p",
          children: [{ type: "text", value: text }],
        },
      ],
      assets: [],
      dataSources: [],
      resources: [],
      props: [],
      breakpoints: [],
      styleSourceSelections: [],
      styleSources: [],
      styles: [],
    },
  });

const selectPasteBody = async ({ page }: { page: Page }) => {
  const navigatorTab = page.getByRole("tab", { name: "Navigator" });
  if ((await navigatorTab.getAttribute("aria-selected")) !== "true") {
    await navigatorTab.click();
  }
  const body = page
    .locator("[data-navigator-tree] [data-tree-button]")
    .filter({ hasText: "Body" })
    .last();
  await body.dblclick();
};

const pasteClipboardData = async ({
  page,
  data,
}: {
  page: Page;
  data: Record<string, string>;
}) => {
  const save = waitForChangeToBeSaved({ page });
  await page.evaluate((data) => {
    const clipboardData = new DataTransfer();
    for (const [mimeType, value] of Object.entries(data)) {
      clipboardData.setData(mimeType, value);
    }
    document.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      })
    );
  }, data);
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const countPastedElements = async ({
  tag,
  text,
}: {
  tag: string;
  text: string;
}) => {
  const build = await loadDevBuild({ projectId: pasteFixture.projectId });
  const instances = JSON.parse(build.instances) as Array<{
    component?: string;
    tag?: string;
    children?: Array<{ type: string; value?: string }>;
  }>;
  return instances.filter(
    (instance) =>
      instance.component === "ws:element" &&
      instance.tag === tag &&
      instance.children?.some(
        (child) => child.type === "text" && child.value?.includes(text)
      )
  ).length;
};

const countBuildInstancesWithText = async (text: string) => {
  const build = await loadDevBuild({ projectId: pasteFixture.projectId });
  const instances = JSON.parse(build.instances) as Array<{
    id: string;
    children?: Array<{ type: string; value?: string }>;
  }>;
  const instancesById = new Map(
    instances.map((instance) => [instance.id, instance])
  );
  const containsText = (instanceId: string): boolean => {
    const instance = instancesById.get(instanceId);
    return (
      instance?.children?.some(
        (child) =>
          (child.type === "text" && child.value?.includes(text)) ||
          (child.type === "id" &&
            child.value !== undefined &&
            containsText(child.value))
      ) ?? false
    );
  };
  return instances.filter((instance) => containsText(instance.id)).length;
};

test("Builder runs paste plugins through generic browser paste events", async () => {
  const { page, close } = await newIsolatedPage();
  const entries = [
    [
      "application/json",
      createInstanceTransfer({
        id: "paste-json",
        text: "Instance JSON paste heading",
      }),
      "Instance JSON paste heading",
      "p",
    ],
    [
      "text/plain",
      createInstanceTransfer({
        id: "paste-text",
        text: "Instance text paste heading",
      }),
      "Instance text paste heading",
      "p",
    ],
    [
      "text/plain",
      '<ws.element ws:tag="h2">JSX paste heading</ws.element>',
      "JSX paste heading",
      "h2",
    ],
    [
      "text/plain",
      "<section><h2>HTML paste heading</h2></section>",
      "HTML paste heading",
      "h2",
    ],
    ["text/plain", "## Markdown paste heading", "Markdown paste heading", "h2"],
    [
      "application/json",
      JSON.stringify({
        type: "@webflow/XscpData",
        payload: {
          nodes: [
            {
              _id: "webflow-heading",
              type: "Heading",
              tag: "h1",
              children: ["webflow-heading-text"],
              classes: [],
            },
            {
              _id: "webflow-heading-text",
              v: "Webflow paste heading",
              text: true,
            },
          ],
          styles: [],
          assets: [],
        },
      }),
      "Webflow paste heading",
      undefined,
    ],
  ] as const;

  try {
    await openProjectBuilder({
      page,
      projectId: pasteFixture.projectId,
      authToken: pasteFixture.builderToken,
    });
    await waitForCanvasText({ page, text: "Initial content" });

    for (const [mimeType, value, text, tag] of entries) {
      await selectPasteBody({ page });
      await pasteClipboardData({ page, data: { [mimeType]: value } });
      await waitForCanvasText({ page, text });
      if (tag === undefined) {
        const count = await countBuildInstancesWithText(text);
        if (count === 0) {
          throw new Error(
            `Expected generic Webflow paste to persist ${JSON.stringify(text)}`
          );
        }
        continue;
      }
      const count = await countPastedElements({ tag, text });
      if (count !== 1) {
        throw new Error(
          `Expected one ${tag} containing ${JSON.stringify(text)}, found ${count}`
        );
      }
    }
  } finally {
    await close();
  }
});
