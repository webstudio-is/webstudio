import { expect, type Browser, type Page } from "@playwright/test";
import type { SerializedPages } from "@webstudio-is/project-migrations/pages";
import { isPageDraft } from "@webstudio-is/sdk";
import { expectTextHidden } from "../flows/assertions";
import {
  getCanvasFrame,
  openProjectBuilder,
  waitForCanvasText,
} from "../flows/builder";
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
  waitForSyncComplete,
} from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import type { SeededContentModeProject } from "../fixtures/content-mode-project";
import { test, withBrowserContext } from "../test";
import { measure } from "../perf";
import { loadDevBuild, updateBuild } from "../db";

test.describe.configure({ mode: "parallel" });

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

const getTreeButton = ({ page, itemName }: { page: Page; itemName: string }) =>
  page
    .locator("[data-tree-button]")
    .filter({ has: page.getByText(itemName, { exact: true }) });

const waitForTemplate = async ({
  page,
  templateName,
}: {
  page: Page;
  templateName: string;
}) => {
  await getTreeButton({ page, itemName: templateName }).waitFor();
};

const waitForCopiedPageTransferData = async ({
  page,
  type,
  name,
}: {
  page: Page;
  type: "page" | "folder" | "template";
  name: string;
}) => {
  await page.waitForFunction(
    async ({ marker, type, name }) => {
      try {
        const data = JSON.parse(await navigator.clipboard.readText())[marker];
        return data?.type === type && data[type]?.name === name;
      } catch {
        return false;
      }
    },
    { marker: copiedPageTransferMarker, type, name }
  );
};

const getDataResourceCounts = (
  fixture: SeededContentModeProject,
  build: Awaited<ReturnType<typeof loadDevBuild>>
) => {
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

const expectDataResourceCopies = (
  before: ReturnType<typeof getDataResourceCounts>,
  after: ReturnType<typeof getDataResourceCounts>
) => {
  const entries = Object.entries(after) as Array<[keyof typeof after, number]>;
  for (const [key, count] of entries) {
    if (count <= before[key]) {
      throw new Error(
        `Expected page template to copy ${key}; before ${before[key]}, after ${count}`
      );
    }
  }
};

const expectSavedPage = async ({
  projectId,
  name,
  draft,
}: {
  projectId: string;
  name: string;
  draft: boolean;
}) => {
  await expect
    .poll(
      async () => {
        const build = await loadDevBuild({ projectId });
        const { pages } = JSON.parse(build.pages) as SerializedPages;
        const savedPage = pages.find((page) => page.name === name);
        return savedPage === undefined ? undefined : isPageDraft(savedPage);
      },
      { message: `Expected saved page "${name}" with draft=${draft}` }
    )
    .toBe(draft);
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
  await getTreeButton({ page, itemName }).click({ button: "right" });
  await page.getByRole("menuitem", { name: action }).click();
};

const pasteFromClipboardShortcut = async ({ page }: { page: Page }) => {
  const save = waitForChangeToBeSaved({ page });
  await page.keyboard.press("ControlOrMeta+V");
  await save;
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

const createPagesFixture = (browser: Browser, scenario: string) =>
  withBrowserContext(browser, (context) =>
    createContentModeProject({
      context,
      email: `pages-actions-${scenario}@webstudio.test`,
      title: "Pages Actions E2E",
      assetNamePrefix: `pages-actions-${scenario}-`,
    })
  );

test("Canvas switches away from an AnimateText page without reloading", async ({
  browser,
  page,
}, workerInfo) => {
  const animationFixture = await withBrowserContext(browser, (context) =>
    createContentModeProject({
      context,
      email: `pages-animation-${workerInfo.parallelIndex}@webstudio.test`,
      title: "Animated Page Switch E2E",
      assetNamePrefix: `pages-animation-${workerInfo.parallelIndex}-`,
      editorToken: `pages-animation-${workerInfo.parallelIndex}-editor-token`,
      builderToken: `pages-animation-${workerInfo.parallelIndex}-builder-token`,
    })
  );
  const build = await loadDevBuild({ projectId: animationFixture.projectId });
  const instances = JSON.parse(build.instances) as Array<{
    type: "instance";
    id: string;
    component: string;
    tag?: string;
    children: Array<{ type: "id" | "text"; value: string }>;
  }>;
  const templateRoot = instances.find(
    (instance) => instance.id === "content-page-template-root"
  );
  if (templateRoot === undefined) {
    throw new Error("Expected page template root");
  }
  templateRoot.children.push({ type: "id", value: "animated-children" });
  instances.push(
    {
      type: "instance",
      id: "animated-children",
      component: "@webstudio-is/sdk-components-animation:AnimateChildren",
      children: [{ type: "id", value: "animated-text" }],
    },
    {
      type: "instance",
      id: "animated-text",
      component: "@webstudio-is/sdk-components-animation:AnimateText",
      children: [{ type: "id", value: "animated-inner" }],
    },
    {
      type: "instance",
      id: "animated-inner",
      component: "ws:element",
      tag: "div",
      children: [{ type: "id", value: "animated-span" }],
    },
    {
      type: "instance",
      id: "animated-span",
      component: "ws:element",
      tag: "span",
      children: [{ type: "text", value: "Animated page text" }],
    }
  );
  await updateBuild(build.id, { instances: JSON.stringify(instances) });

  await openProjectBuilder({
    page,
    projectId: animationFixture.projectId,
    authToken: animationFixture.builderToken,
  });
  await createPageFromTemplate({
    page,
    templateName: animationFixture.pageTemplateName,
    pageName: "Animated Page",
    canvasText: "Animated page text",
  });
  const canvas = await getCanvasFrame(page);
  if (canvas === undefined) {
    throw new Error("Expected canvas frame");
  }
  await canvas
    .locator(
      '[data-ws-component="@webstudio-is/sdk-components-animation:AnimateText"]'
    )
    .getByText("Animated page text")
    .waitFor();
  await openPage({
    page,
    pageName: "Home",
    canvasText: animationFixture.shareLinkEditableText,
  });
  expect(await getCanvasFrame(page)).toBe(canvas);
  await openPage({
    page,
    pageName: "Animated Page",
    canvasText: "Animated page text",
  });
  expect(await getCanvasFrame(page)).toBe(canvas);
});

test("Builder can draft, stage, copy, duplicate, and delete a page from the header menu", async ({
  browser,
  page,
}) => {
  const fixture = await createPagesFixture(browser, "page");
  const pageName = "Actions Menu Page";
  const renamedPageName = "Renamed Actions Menu Page";
  const copiedPageName = `${renamedPageName} (1)`;
  const duplicatedPageName = `${renamedPageName} (2)`;

  await measure("pages actions open builder for page actions", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
  });
  const dataResourceCountsBefore = getDataResourceCounts(
    fixture,
    await loadDevBuild({ projectId: fixture.projectId })
  );

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
  const templateBuild = await loadDevBuild({ projectId: fixture.projectId });
  expectDataResourceCopies(
    dataResourceCountsBefore,
    getDataResourceCounts(fixture, templateBuild)
  );

  const results = await Promise.allSettled([
    measure("pages actions generated app build for copied resources", () =>
      expectGeneratedAppBuild({ build: templateBuild })
    ),
    test.step("Page actions and persistence", async () => {
      await openPageSettings({ page, pageName });
      await page.getByLabel("Page name", { exact: true }).fill(renamedPageName);
      await page.getByLabel("Page name", { exact: true }).blur();
      await waitForPageRow({ page, pageName: renamedPageName });
      await expectPageRowHidden({ page, pageName });

      await expectSavedPage({
        projectId: fixture.projectId,
        name: renamedPageName,
        draft: false,
      });
      await selectHeaderAction({
        page,
        menuLabel: "Page actions",
        action: "Mark as draft",
      });
      await waitForPageRow({ page, pageName: `[Draft] ${renamedPageName}` });
      await expectSavedPage({
        projectId: fixture.projectId,
        name: renamedPageName,
        draft: true,
      });

      await openPageSettings({
        page,
        pageName: `[Draft] ${renamedPageName}`,
      });
      await page
        .getByText(
          "Stage this page for publish before setting it as the home page"
        )
        .waitFor();
      await selectHeaderAction({
        page,
        menuLabel: "Page actions",
        action: "Stage for publish",
      });
      await waitForPageRow({ page, pageName: renamedPageName });
      await expectSavedPage({
        projectId: fixture.projectId,
        name: renamedPageName,
        draft: false,
      });

      await openPageSettings({ page, pageName: renamedPageName });
      await selectHeaderAction({
        page,
        menuLabel: "Page actions",
        action: "Copy",
      });
      await waitForCopiedPageTransferData({
        page,
        type: "page",
        name: renamedPageName,
      });
      await pasteFromClipboardShortcut({ page });
      await waitForPageRow({ page, pageName: copiedPageName });

      const previousCanvas = await getCanvasFrame(page);
      if (previousCanvas === undefined) {
        throw new Error("Expected canvas before switching pages");
      }
      // Reproduce a component changing React-owned DOM before page teardown.
      await previousCanvas
        .getByText(fixture.pageTemplateText, { exact: true })
        .first()
        .evaluate((element) => element.remove());
      await openPage({
        page,
        pageName: copiedPageName,
        canvasText: fixture.pageTemplateText,
      });
      expect(await getCanvasFrame(page)).toBe(previousCanvas);

      await openPageSettings({ page, pageName: renamedPageName });
      await Promise.all([
        waitForChangeToBeSaved({ page }),
        selectHeaderAction({
          page,
          menuLabel: "Page actions",
          action: "Duplicate",
        }),
      ]);
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
      expectDataResourceCopies(
        dataResourceCountsBefore,
        getDataResourceCounts(
          fixture,
          await loadDevBuild({ projectId: fixture.projectId })
        )
      );
    }),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      throw result.reason;
    }
  }
});

test("Builder can rename, copy, duplicate, and delete folders and page templates", async ({
  browser,
  page,
}) => {
  const fixture = await createPagesFixture(browser, "folder-template");
  const folderName = "Actions Menu Folder";
  const renamedFolderName = "Renamed Actions Menu Folder";
  const copiedFolderName = `${renamedFolderName} (1)`;
  const duplicatedFolderName = `${renamedFolderName} (2)`;

  const templateName = fixture.pageTemplateName;
  const renamedTemplateName = "Renamed Content Page Template";
  const copiedTemplateName = `${renamedTemplateName} (1)`;
  const duplicatedTemplateName = `${renamedTemplateName} (2)`;

  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });

  await test.step("Folder context menu actions", async () => {
    await createFolder({ page, folderName });

    await openFolderSettings({ page, folderName });
    await page
      .getByLabel("Folder name", { exact: true })
      .fill(renamedFolderName);
    await page.getByLabel("Folder name", { exact: true }).blur();
    await waitForFolderRow({ page, folderName: renamedFolderName });
    await expectTextHidden({ page, text: folderName });

    await selectContextAction({
      page,
      itemName: renamedFolderName,
      action: "Copy",
    });
    await waitForCopiedPageTransferData({
      page,
      type: "folder",
      name: renamedFolderName,
    });
    await selectContextAction({ page, itemName: "Home", action: "Paste" });
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
  });

  await test.step("Template header and context menu actions", async () => {
    await openTemplateSettings({ page, templateName });
    await page
      .getByLabel("Template name", { exact: true })
      .fill(renamedTemplateName);
    await page.getByLabel("Template name", { exact: true }).blur();
    await waitForTemplate({ page, templateName: renamedTemplateName });

    await openTemplateSettings({ page, templateName: renamedTemplateName });
    await selectHeaderAction({
      page,
      menuLabel: "Template actions",
      action: "Copy",
    });
    await waitForCopiedPageTransferData({
      page,
      type: "template",
      name: renamedTemplateName,
    });
    await page.keyboard.press("ControlOrMeta+V");
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
    const save = waitForChangeToBeSaved({ page });
    await confirmDialogAction({ page, action: "Delete Template" });
    await save;
    await expectTextHidden({ page, text: duplicatedTemplateName });
  });

  await test.step("Folder and template changes persist after reopening Builder", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await openPagesPanel({ page });
    await waitForFolderRow({ page, folderName: renamedFolderName });
    await expectTextHidden({ page, text: folderName });
    await waitForFolderRow({ page, folderName: copiedFolderName });
    await openFolderSettings({ page, folderName: copiedFolderName });
    await expectTextHidden({ page, text: duplicatedFolderName });
    await waitForTemplate({ page, templateName: renamedTemplateName });
    await waitForTemplate({ page, templateName: copiedTemplateName });
    await expectTextHidden({ page, text: duplicatedTemplateName });
  });
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
};

test("Builder runs paste plugins through generic browser paste events", async ({
  browser,
  page,
}) => {
  const fixture = await createPagesFixture(browser, "paste");
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
    ["text/plain", "<h2>JSX paste heading</h2>", "JSX paste heading", "h2"],
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

  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  await waitForCanvasText({ page, text: "Initial content" });

  for (const [mimeType, value, text] of entries) {
    await selectPasteBody({ page });
    await pasteClipboardData({ page, data: { [mimeType]: value } });
    await waitForCanvasText({ page, text });
  }
  await waitForSyncComplete({ page });

  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances = JSON.parse(build.instances) as Array<{
    component: string;
    tag?: string;
    children: Array<{ type: string; value: string }>;
  }>;
  for (const [, , text, tag] of entries) {
    // The Webflow plugin can wrap its text in a generated instance.
    const matches = instances.filter(
      (instance) =>
        (tag === undefined ||
          (instance.component === "ws:element" && instance.tag === tag)) &&
        instance.children.some(
          (child) => child.type === "text" && child.value.includes(text)
        )
    );
    if (tag === undefined) {
      expect(matches.length, text).toBeGreaterThan(0);
    } else {
      expect(matches, text).toHaveLength(1);
    }
  }
});
