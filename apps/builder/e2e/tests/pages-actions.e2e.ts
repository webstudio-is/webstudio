import type { Page } from "playwright";
import { expectTextHidden } from "../flows/assertions";
import {
  openProjectBuilder,
  waitForCanvasText,
  waitForCanvasTextHidden,
} from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
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
let navigatorStructuralFixture: SeededContentModeProject;

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

const getInstanceComponentCount = async ({
  fixture,
  component,
}: {
  fixture: SeededContentModeProject;
  component: string;
}) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances = JSON.parse(build.instances) as Array<{
    component: string;
  }>;
  return instances.filter((instance) => instance.component === component)
    .length;
};

const getElementTagCount = async ({
  fixture,
  tag,
}: {
  fixture: SeededContentModeProject;
  tag: string;
}) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances = JSON.parse(build.instances) as Array<{
    component: string;
    tag?: string;
  }>;
  return instances.filter(
    (instance) => instance.component === "ws:element" && instance.tag === tag
  ).length;
};

const getElementTagWithTextCount = async ({
  fixture,
  tag,
  text,
}: {
  fixture: SeededContentModeProject;
  tag: string;
  text: string;
}) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances = JSON.parse(build.instances) as Array<{
    id: string;
    component: string;
    tag?: string;
    children?: Array<{ type: string; value?: string }>;
  }>;
  const instancesById = new Map(
    instances.map((instance) => [instance.id, instance])
  );

  const instanceContainsText = (instanceId: string): boolean => {
    const instance = instancesById.get(instanceId);
    if (instance === undefined) {
      return false;
    }
    return (
      instance.children?.some((child) => {
        if (child.type === "text") {
          return child.value?.includes(text);
        }
        if (child.type === "id" && child.value !== undefined) {
          return instanceContainsText(child.value);
        }
        return false;
      }) ?? false
    );
  };

  return instances.filter(
    (instance) =>
      instance.component === "ws:element" &&
      instance.tag === tag &&
      instanceContainsText(instance.id)
  ).length;
};

const getElementWithTextParentTag = async ({
  fixture,
  tag,
  text,
}: {
  fixture: SeededContentModeProject;
  tag: string;
  text: string;
}) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances = JSON.parse(build.instances) as Array<{
    id: string;
    component: string;
    tag?: string;
    children?: Array<{ type: string; value?: string }>;
  }>;
  const instancesById = new Map(
    instances.map((instance) => [instance.id, instance])
  );
  const parentByChildId = new Map<string, string>();
  for (const instance of instances) {
    for (const child of instance.children ?? []) {
      if (child.type === "id" && child.value !== undefined) {
        parentByChildId.set(child.value, instance.id);
      }
    }
  }

  const instanceContainsText = (instanceId: string): boolean => {
    const instance = instancesById.get(instanceId);
    if (instance === undefined) {
      return false;
    }
    return (
      instance.children?.some((child) => {
        if (child.type === "text") {
          return child.value?.includes(text);
        }
        if (child.type === "id" && child.value !== undefined) {
          return instanceContainsText(child.value);
        }
        return false;
      }) ?? false
    );
  };

  const instance = instances.find(
    (instance) =>
      instance.component === "ws:element" &&
      instance.tag === tag &&
      instanceContainsText(instance.id)
  );
  if (instance === undefined) {
    return;
  }
  const parentId = parentByChildId.get(instance.id);
  if (parentId === undefined) {
    return;
  }
  return instancesById.get(parentId)?.tag;
};

const getDirectChildTextOrder = async ({
  fixture,
  parentTag,
  texts,
}: {
  fixture: SeededContentModeProject;
  parentTag: string;
  texts: string[];
}) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances = JSON.parse(build.instances) as Array<{
    id: string;
    component: string;
    tag?: string;
    children?: Array<{ type: string; value?: string }>;
  }>;
  const instancesById = new Map(
    instances.map((instance) => [instance.id, instance])
  );

  const collectText = (instanceId: string): string => {
    const instance = instancesById.get(instanceId);
    if (instance === undefined) {
      return "";
    }
    return (instance.children ?? [])
      .map((child) => {
        if (child.type === "text") {
          return child.value ?? "";
        }
        if (child.type === "id" && child.value !== undefined) {
          return collectText(child.value);
        }
        return "";
      })
      .join(" ");
  };

  const parent = instances.find(
    (instance) =>
      instance.component === "ws:element" && instance.tag === parentTag
  );
  if (parent === undefined) {
    return [];
  }
  return (parent.children ?? [])
    .flatMap((child, index) => {
      if (child.type !== "id" || child.value === undefined) {
        return [];
      }
      const content = collectText(child.value);
      return texts
        .filter((text) => content.includes(text))
        .map((text) => ({ text, index }));
    })
    .sort((left, right) => left.index - right.index)
    .map(({ text }) => text);
};

const getInstanceLabelCount = async ({
  fixture,
  label,
}: {
  fixture: SeededContentModeProject;
  label: string;
}) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances = JSON.parse(build.instances) as Array<{
    label?: string;
  }>;
  return instances.filter((instance) => instance.label === label).length;
};

const getInstanceComponentCountSummary = async (
  fixture: SeededContentModeProject
) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances = JSON.parse(build.instances) as Array<{
    component: string;
  }>;
  const counts = new Map<string, number>();
  for (const { component } of instances) {
    counts.set(component, (counts.get(component) ?? 0) + 1);
  }
  return Array.from(counts, ([component, count]) => `${component}:${count}`)
    .sort()
    .join(", ");
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

const pastePlainTextFromClipboardShortcut = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text);
  }, text);
  const save = waitForChangeToBeSaved({ page });
  await page.keyboard.press("ControlOrMeta+V");
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const selectAppMenuItem = async ({
  page,
  name,
}: {
  page: Page;
  name: string;
}) => {
  await page.bringToFront();
  await page.getByRole("button", { name: "Menu Button" }).click();
  const menuItem = page.getByRole("menuitem", { name });
  await menuItem.waitFor();
  await menuItem.click();
};

const undoShortcut = async ({
  page,
  waitForSave = true,
}: {
  page: Page;
  waitForSave?: boolean;
}) => {
  await waitForSyncStatus({ page, status: "idle" });
  const save =
    waitForSave === true
      ? waitForChangeToBeSaved({ page, timeout: 30_000 })
      : undefined;
  await selectAppMenuItem({ page, name: "Undo" });
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const redoShortcut = async ({ page }: { page: Page }) => {
  await waitForSyncStatus({ page, status: "idle" });
  const save = waitForChangeToBeSaved({ page, timeout: 30_000 });
  await selectAppMenuItem({ page, name: "Redo" });
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const moveSelectedNavigatorInstance = async ({
  page,
  shortcut,
}: {
  page: Page;
  shortcut: "Control+ArrowLeft" | "Control+ArrowRight" | "Control+ArrowUp";
}) => {
  const save = waitForChangeToBeSaved({ page });
  await page.keyboard.press(shortcut);
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const openComponentsPanel = async ({ page }: { page: Page }) => {
  await page.getByRole("tab", { name: "Components" }).click();
  await page.getByPlaceholder("Find components").waitFor();
};

const searchComponentsPanel = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  const search = page.getByPlaceholder("Find components");
  await search.fill(text);
};

const expectComponentPanelOptionHidden = async ({
  page,
  name,
}: {
  page: Page;
  name: string;
}) => {
  await searchComponentsPanel({ page, text: name });
  await page
    .getByRole("option", { name, exact: true })
    .waitFor({ state: "hidden" });
};

const insertComponentPanelOption = async ({
  page,
  name,
}: {
  page: Page;
  name: string;
}) => {
  await searchComponentsPanel({ page, text: name });
  await page.getByRole("option", { name, exact: true }).click();
  await waitForSyncStatus({ page, status: "idle" });
};

const openCommandPanel = async ({ page }: { page: Page }) => {
  await page.keyboard.press("ControlOrMeta+K");
  await page
    .getByPlaceholder("Type a command or search...", { exact: true })
    .waitFor();
};

const selectCommandPanelItem = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  const item = page.locator("[cmdk-item]").filter({ hasText: text }).first();
  await item.waitFor({ state: "visible" });
  await item.dblclick();
};

const runCommandPanelStructuralAction = async ({
  page,
  command,
  option,
}: {
  page: Page;
  command: "Wrap" | "Convert" | "Unwrap";
  option?: string;
}) => {
  await openCommandPanel({ page });
  const commandInput = page.getByPlaceholder("Type a command or search...", {
    exact: true,
  });
  await commandInput.fill(command);
  await selectCommandPanelItem({ page, text: command });
  if (option === undefined) {
    await waitForChangeToBeSaved({ page });
    return;
  }

  const optionInput = page
    .getByPlaceholder(
      command === "Wrap"
        ? "Search components to wrap with..."
        : "Search components to convert...",
      { exact: true }
    )
    .first();
  await optionInput.waitFor();
  await optionInput.fill(option);
  await selectCommandPanelItem({ page, text: option });
  await waitForChangeToBeSaved({ page });
};

const runCommandPanelTagInsertion = async ({
  page,
  tag,
}: {
  page: Page;
  tag: string;
}) => {
  await openCommandPanel({ page });
  const commandInput = page.getByPlaceholder("Type a command or search...", {
    exact: true,
  });
  await commandInput.fill(tag);
  await selectCommandPanelItem({ page, text: `<${tag}>` });
  await waitForChangeToBeSaved({ page });
};

const selectCommandPanelInstance = async ({
  page,
  label,
}: {
  page: Page;
  label: string;
}) => {
  await openCommandPanel({ page });
  const commandInput = page.getByPlaceholder("Type a command or search...", {
    exact: true,
  });
  await commandInput.fill(label);
  await selectCommandPanelItem({ page, text: label });
};

const openNavigatorPanel = async ({ page }: { page: Page }) => {
  const tab = page.getByRole("tab", { name: "Navigator" });
  if ((await tab.getAttribute("aria-selected")) !== "true") {
    await tab.click();
  }
  await page.locator("[data-navigator-tree]").waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

const getNavigatorButtonSummary = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  return await page
    .locator("[data-navigator-tree] [data-tree-button]")
    .evaluateAll((buttons, text) => {
      return buttons
        .map((button, index) => ({
          index,
          selected: button.getAttribute("aria-selected"),
          text: button.textContent?.replace(/\s+/g, " ").trim() ?? "",
        }))
        .filter((button) =>
          button.text.toLowerCase().includes((text as string).toLowerCase())
        );
    }, text);
};

const selectNavigatorItem = async ({
  page,
  itemName,
}: {
  page: Page;
  itemName: string;
}) => {
  const item = page
    .locator("[data-navigator-tree] [data-tree-button]")
    .filter({ hasText: itemName })
    .last();
  await item.waitFor({ state: "visible" });
  await item.click();
  await item.click();
};

const editSelectedNavigatorLabel = async ({
  page,
  label,
}: {
  page: Page;
  label: string;
}) => {
  await page.keyboard.press("ControlOrMeta+E");
  const editableLabel = page.locator('[contenteditable="plaintext-only"]');
  await editableLabel.waitFor({ state: "visible" });
  await editableLabel.fill(label);
  await editableLabel.press("Enter");
  await waitForChangeToBeSaved({ page });
};

const selectNavigatorContextAction = async ({
  page,
  itemName,
  action,
}: {
  page: Page;
  itemName: string;
  action: "Duplicate" | "Delete";
}) => {
  const selectedMatchingItem = page
    .locator('[data-navigator-tree] [data-tree-button][aria-selected="true"]')
    .filter({ hasText: itemName })
    .first();
  const fallbackItem = page
    .locator("[data-navigator-tree] [data-tree-button]")
    .filter({ hasText: itemName })
    .first();
  const item =
    (await selectedMatchingItem.count()) > 0
      ? selectedMatchingItem
      : fallbackItem;
  await item.waitFor({ state: "visible" });
  // The Navigator can intentionally skip the first click after a prior
  // pointer interaction. A second ordinary click guarantees the context menu
  // action runs against this row's fresh single selection.
  await item.click();
  await item.click();
  await item.click({ button: "right" });
  const menuItem = page.getByRole("menuitem", { name: action });
  await menuItem.waitFor({ state: "visible" });
  const ariaDisabled = await menuItem.getAttribute("aria-disabled");
  const dataDisabled = await menuItem.getAttribute("data-disabled");
  if (ariaDisabled === "true" || dataDisabled !== null) {
    throw new Error(
      `Expected Navigator ${action} action to be enabled. aria-disabled=${ariaDisabled}, data-disabled=${dataDisabled}`
    );
  }
  await menuItem.click();
  await waitForChangeToBeSaved({ page });
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
  navigatorStructuralFixture = await createContentModeProject({
    email: "pages-actions-navigator-structural-e2e@webstudio.test",
    title: "Pages Actions Navigator Structural E2E",
    assetNamePrefix: "pages-actions-navigator-structural-",
    editorToken: "pages-actions-navigator-structural-e2e-editor-token",
    builderToken: "pages-actions-navigator-structural-e2e-builder-token",
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
      await undoShortcut({ page, waitForSave: false });
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

test("Builder Components panel filters catalog-only entries and inserts a persisted component", async () => {
  const { page, close } = await newIsolatedPage();
  const insertedButtonText = "Button";

  try {
    await measure(
      "pages actions open builder for components panel",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });

    await measure(
      "pages actions verify components panel catalog filters",
      async () => {
        await openComponentsPanel({ page });
        await expectComponentPanelOptionHidden({ page, name: "Box" });
        await expectComponentPanelOptionHidden({ page, name: "Body" });
      }
    );

    await selectCanvasTextInstance({ page, text: "Initial content" });
    await measure(
      "pages actions insert component from components panel",
      async () => {
        await openComponentsPanel({ page });
        await insertComponentPanelOption({ page, name: "Button" });
      }
    );
    await waitForCanvasText({ page, text: insertedButtonText });

    await measure("pages actions reload components panel insert", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text: insertedButtonText });
  } finally {
    await close();
  }
});

test("Builder can duplicate a component through the engine bridge, undo, redo, and reload", async () => {
  const { page, close } = await newIsolatedPage();
  const componentName = "Image";

  try {
    await measure("pages actions open builder for command panel", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text: "Initial content" });
    await selectCanvasTextInstance({ page, text: "Initial content" });

    const initialCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });

    await measure(
      "pages actions insert component before command duplicate",
      async () => {
        await openComponentsPanel({ page });
        await insertComponentPanelOption({ page, name: componentName });
      }
    );
    const insertedCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (insertedCount !== initialCount + 1) {
      throw new Error(
        `Expected components panel to insert one ${componentName}. Before ${initialCount}, after ${insertedCount}`
      );
    }

    await measure("pages actions duplicate inserted component", async () => {
      await page.keyboard.press("ControlOrMeta+D");
      await waitForSyncStatus({ page, status: "idle" });
    });
    const duplicatedCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (duplicatedCount !== initialCount + 2) {
      throw new Error(
        `Expected duplicate command to add one ${componentName}. Before ${initialCount}, after ${duplicatedCount}`
      );
    }

    await measure("pages actions undo duplicate command", async () => {
      await undoShortcut({ page });
    });
    const undoCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (undoCount !== initialCount + 1) {
      throw new Error(
        `Expected undo to remove duplicated ${componentName}. Before ${initialCount}, after ${undoCount}`
      );
    }

    await measure("pages actions redo duplicate command", async () => {
      await redoShortcut({ page });
    });
    const redoCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (redoCount !== initialCount + 2) {
      throw new Error(
        `Expected redo to restore duplicated ${componentName}. Before ${initialCount}, after ${redoCount}`
      );
    }

    await measure("pages actions reload duplicate command", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    const reloadedCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (reloadedCount !== initialCount + 2) {
      throw new Error(
        `Expected reloaded project to keep duplicated ${componentName}. Before ${initialCount}, after ${reloadedCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder can duplicate and delete a component from Navigator context menu", async () => {
  const { page, close } = await newIsolatedPage();
  const componentName = "Image";

  try {
    await measure(
      "pages actions open builder for navigator context menu",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });
    await selectCanvasTextInstance({ page, text: "Initial content" });

    const initialCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });

    await measure(
      "pages actions insert component before navigator actions",
      async () => {
        await openComponentsPanel({ page });
        await insertComponentPanelOption({ page, name: componentName });
      }
    );
    const insertedCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (insertedCount !== initialCount + 1) {
      throw new Error(
        `Expected components panel to insert one ${componentName}. Before ${initialCount}, after ${insertedCount}. Components: ${await getInstanceComponentCountSummary(fixture)}`
      );
    }

    await measure(
      "pages actions duplicate component from navigator",
      async () => {
        await openNavigatorPanel({ page });
        await selectNavigatorContextAction({
          page,
          itemName: componentName,
          action: "Duplicate",
        });
      }
    );
    const duplicatedCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (duplicatedCount !== initialCount + 2) {
      throw new Error(
        `Expected Navigator duplicate to add one ${componentName}. Before ${initialCount}, after ${duplicatedCount}. Components: ${await getInstanceComponentCountSummary(fixture)}. Navigator: ${JSON.stringify(await getNavigatorButtonSummary({ page, text: componentName }))}`
      );
    }

    await measure("pages actions undo navigator duplicate", async () => {
      await undoShortcut({ page });
    });
    const undoDuplicateCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (undoDuplicateCount !== initialCount + 1) {
      throw new Error(
        `Expected undo to remove Navigator duplicate ${componentName}. Before ${initialCount}, after ${undoDuplicateCount}`
      );
    }

    await measure("pages actions redo navigator duplicate", async () => {
      await redoShortcut({ page });
    });
    const redoDuplicateCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (redoDuplicateCount !== initialCount + 2) {
      throw new Error(
        `Expected redo to restore Navigator duplicate ${componentName}. Before ${initialCount}, after ${redoDuplicateCount}`
      );
    }

    await measure("pages actions delete component from navigator", async () => {
      await openNavigatorPanel({ page });
      await selectNavigatorContextAction({
        page,
        itemName: componentName,
        action: "Delete",
      });
    });
    const deletedCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (deletedCount !== initialCount + 1) {
      throw new Error(
        `Expected Navigator delete to remove one ${componentName}. Before ${initialCount}, after ${deletedCount}`
      );
    }

    await measure("pages actions undo navigator delete", async () => {
      await undoShortcut({ page });
    });
    const undoDeleteCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (undoDeleteCount !== initialCount + 2) {
      throw new Error(
        `Expected undo to restore Navigator-deleted ${componentName}. Before ${initialCount}, after ${undoDeleteCount}`
      );
    }

    await measure(
      "pages actions reload navigator context menu mutations",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    const reloadedCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (reloadedCount !== initialCount + 2) {
      throw new Error(
        `Expected reload to preserve Navigator mutations for ${componentName}. Before ${initialCount}, after ${reloadedCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder Navigator keyboard move, reparent, and reorder persist after reload", async () => {
  const { page, close } = await newIsolatedPage();
  const sectionText = "Navigator move section";
  const asideText = "Navigator move aside";
  const html = `
    <section>
      <h2>${sectionText}</h2>
    </section>
    <aside>
      <p>${asideText}</p>
    </aside>
  `;

  try {
    await measure(
      "pages actions open builder for navigator keyboard moves",
      async () => {
        await openProjectBuilder({
          page,
          projectId: navigatorStructuralFixture.projectId,
          authToken: navigatorStructuralFixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });

    await measure("pages actions paste navigator move siblings", async () => {
      await openNavigatorPanel({ page });
      await selectNavigatorItem({ page, itemName: "Body" });
      await pastePlainTextFromClipboardShortcut({ page, text: html });
    });
    await waitForCanvasText({ page, text: sectionText });
    await waitForCanvasText({ page, text: asideText });

    await measure(
      "pages actions move navigator item into previous sibling",
      async () => {
        await openNavigatorPanel({ page });
        await selectNavigatorItem({ page, itemName: "aside" });
        await moveSelectedNavigatorInstance({
          page,
          shortcut: "Control+ArrowRight",
        });
      }
    );
    const reparentedParentTag = await getElementWithTextParentTag({
      fixture: navigatorStructuralFixture,
      tag: "aside",
      text: asideText,
    });
    if (reparentedParentTag !== "section") {
      throw new Error(
        `Expected Navigator move-in to reparent aside into section, found parent ${reparentedParentTag}`
      );
    }

    await measure("pages actions move navigator item back out", async () => {
      await openNavigatorPanel({ page });
      await selectNavigatorItem({ page, itemName: "aside" });
      await moveSelectedNavigatorInstance({
        page,
        shortcut: "Control+ArrowLeft",
      });
    });
    const outdentedParentTag = await getElementWithTextParentTag({
      fixture: navigatorStructuralFixture,
      tag: "aside",
      text: asideText,
    });
    if (outdentedParentTag !== "body") {
      throw new Error(
        `Expected Navigator move-out to reparent aside back to body, found parent ${outdentedParentTag}`
      );
    }

    await measure(
      "pages actions reorder navigator item above previous sibling",
      async () => {
        await openNavigatorPanel({ page });
        await selectNavigatorItem({ page, itemName: "aside" });
        await moveSelectedNavigatorInstance({
          page,
          shortcut: "Control+ArrowUp",
        });
      }
    );
    const reorderedTextOrder = await getDirectChildTextOrder({
      fixture: navigatorStructuralFixture,
      parentTag: "body",
      texts: [sectionText, asideText],
    });
    if (reorderedTextOrder.join("|") !== `${asideText}|${sectionText}`) {
      throw new Error(
        `Expected Navigator move-up to place aside before section, found order ${reorderedTextOrder.join(" -> ")}`
      );
    }

    await measure("pages actions reload navigator keyboard moves", async () => {
      await openProjectBuilder({
        page,
        projectId: navigatorStructuralFixture.projectId,
        authToken: navigatorStructuralFixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text: sectionText });
    await waitForCanvasText({ page, text: asideText });
    const reloadedParentTag = await getElementWithTextParentTag({
      fixture: navigatorStructuralFixture,
      tag: "aside",
      text: asideText,
    });
    const reloadedTextOrder = await getDirectChildTextOrder({
      fixture: navigatorStructuralFixture,
      parentTag: "body",
      texts: [sectionText, asideText],
    });
    if (reloadedParentTag !== "body") {
      throw new Error(
        `Expected reload to preserve moved aside under body, found parent ${reloadedParentTag}`
      );
    }
    if (reloadedTextOrder.join("|") !== `${asideText}|${sectionText}`) {
      throw new Error(
        `Expected reload to preserve Navigator reorder, found order ${reloadedTextOrder.join(" -> ")}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder command panel structural mutations persist after reload", async () => {
  const { page, close } = await newIsolatedPage();
  const anchorText = "Initial content";
  const componentName = "Image";

  try {
    await measure(
      "pages actions open builder for command structural actions",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: anchorText });
    await selectCanvasTextInstance({ page, text: anchorText });

    await measure(
      "pages actions insert component before structural actions",
      async () => {
        await openComponentsPanel({ page });
        await insertComponentPanelOption({ page, name: componentName });
      }
    );
    const insertedImageCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });

    const initialDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });
    const initialSectionCount = await getElementTagCount({
      fixture,
      tag: "section",
    });

    await measure(
      "pages actions wrap selected instance from command panel",
      async () => {
        await runCommandPanelStructuralAction({
          page,
          command: "Wrap",
          option: "div",
        });
      }
    );
    const wrappedDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });
    if (wrappedDivCount !== initialDivCount + 1) {
      throw new Error(
        `Expected command panel Wrap to add one div. Before ${initialDivCount}, after ${wrappedDivCount}`
      );
    }
    await openNavigatorPanel({ page });
    await selectNavigatorItem({ page, itemName: "div" });

    await measure(
      "pages actions convert wrapper from command panel",
      async () => {
        await runCommandPanelStructuralAction({
          page,
          command: "Convert",
          option: "section",
        });
      }
    );
    const convertedDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });
    const convertedSectionCount = await getElementTagCount({
      fixture,
      tag: "section",
    });
    if (convertedDivCount !== initialDivCount) {
      throw new Error(
        `Expected command panel Convert to replace the wrapper div. Before ${initialDivCount}, after ${convertedDivCount}`
      );
    }
    if (convertedSectionCount !== initialSectionCount + 1) {
      throw new Error(
        `Expected command panel Convert to add one section. Before ${initialSectionCount}, after ${convertedSectionCount}`
      );
    }
    await measure(
      "pages actions reload command structural actions",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: anchorText });
    const reloadedSectionCount = await getElementTagCount({
      fixture,
      tag: "section",
    });
    const reloadedImageCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (reloadedSectionCount !== initialSectionCount + 1) {
      throw new Error(
        `Expected reload to preserve command panel converted section wrapper. Before ${initialSectionCount}, after ${reloadedSectionCount}`
      );
    }
    if (reloadedImageCount !== insertedImageCount) {
      throw new Error(
        `Expected reload to preserve command panel target ${componentName}. Before ${insertedImageCount}, after ${reloadedImageCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder Navigator label and command unwrap persist after reload", async () => {
  const { page, close } = await newIsolatedPage();
  const anchorText = "Initial content";
  const componentName = "Image";
  const renamedLabel = "Hero media";

  try {
    await measure(
      "pages actions open builder for label and unwrap",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: anchorText });
    await selectCanvasTextInstance({ page, text: anchorText });

    await measure(
      "pages actions insert component before label and unwrap",
      async () => {
        await openComponentsPanel({ page });
        await insertComponentPanelOption({ page, name: componentName });
      }
    );
    const insertedImageCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    const initialDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });

    await measure("pages actions edit navigator label", async () => {
      await openNavigatorPanel({ page });
      await selectNavigatorItem({ page, itemName: componentName });
      await editSelectedNavigatorLabel({ page, label: renamedLabel });
    });
    const renamedCount = await getInstanceLabelCount({
      fixture,
      label: renamedLabel,
    });
    if (renamedCount !== 1) {
      throw new Error(
        `Expected one Navigator label "${renamedLabel}" after rename, found ${renamedCount}`
      );
    }

    await measure(
      "pages actions wrap renamed component before unwrap",
      async () => {
        await runCommandPanelStructuralAction({
          page,
          command: "Wrap",
          option: "div",
        });
      }
    );
    const wrappedDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });
    if (wrappedDivCount !== initialDivCount + 1) {
      throw new Error(
        `Expected wrap before unwrap to add one div. Before ${initialDivCount}, after ${wrappedDivCount}`
      );
    }

    await measure(
      "pages actions unwrap renamed component from command panel",
      async () => {
        await selectCommandPanelInstance({ page, label: renamedLabel });
        await runCommandPanelStructuralAction({
          page,
          command: "Unwrap",
        });
      }
    );
    const unwrappedDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });
    const unwrappedImageCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (unwrappedDivCount !== initialDivCount) {
      throw new Error(
        `Expected unwrap to remove the wrapper div. Before ${initialDivCount}, after ${unwrappedDivCount}`
      );
    }
    if (unwrappedImageCount !== insertedImageCount) {
      throw new Error(
        `Expected unwrap to preserve ${componentName}. Before ${insertedImageCount}, after ${unwrappedImageCount}`
      );
    }

    await measure("pages actions reload label and unwrap", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    const reloadedLabelCount = await getInstanceLabelCount({
      fixture,
      label: renamedLabel,
    });
    const reloadedDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });
    const reloadedImageCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (reloadedLabelCount !== 1) {
      throw new Error(
        `Expected reload to preserve Navigator label "${renamedLabel}", found ${reloadedLabelCount}`
      );
    }
    if (reloadedDivCount !== initialDivCount) {
      throw new Error(
        `Expected reload to preserve unwrapped tree. Before ${initialDivCount}, after ${reloadedDivCount}`
      );
    }
    if (reloadedImageCount !== insertedImageCount) {
      throw new Error(
        `Expected reload to preserve unwrapped ${componentName}. Before ${insertedImageCount}, after ${reloadedImageCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder command panel tag insertion persists after reload", async () => {
  const { page, close } = await newIsolatedPage();
  const anchorText = "Initial content";
  const tag = "aside";

  try {
    await measure(
      "pages actions open builder for command tag insertion",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: anchorText });

    const initialAsideCount = await getElementTagCount({
      fixture,
      tag,
    });

    await measure(
      "pages actions select body before command tag insertion",
      async () => {
        await openNavigatorPanel({ page });
        await selectNavigatorItem({ page, itemName: "Body" });
      }
    );

    await measure("pages actions insert tag from command panel", async () => {
      await runCommandPanelTagInsertion({ page, tag });
    });
    const insertedAsideCount = await getElementTagCount({
      fixture,
      tag,
    });
    if (insertedAsideCount !== initialAsideCount + 1) {
      throw new Error(
        `Expected command panel tag insertion to add one ${tag}. Before ${initialAsideCount}, after ${insertedAsideCount}`
      );
    }

    await measure("pages actions reload command tag insertion", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    const reloadedAsideCount = await getElementTagCount({
      fixture,
      tag,
    });
    if (reloadedAsideCount !== initialAsideCount + 1) {
      throw new Error(
        `Expected reload to preserve command panel ${tag} insertion. Before ${initialAsideCount}, after ${reloadedAsideCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder pastes external HTML fragments through clipboard and reloads them", async () => {
  const { page, close } = await newIsolatedPage();
  const pastedHeading = "External paste heading";
  const pastedLink = "External paste link";
  const html = `
    <section>
      <article>
        <h2>${pastedHeading}</h2>
        <p>Nested external paste paragraph.</p>
        <a href="/external-paste">${pastedLink}</a>
      </article>
    </section>
  `;

  try {
    await measure(
      "pages actions open builder for external html paste",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });

    const initialSectionCount = await getElementTagCount({
      fixture,
      tag: "section",
    });
    const initialArticleCount = await getElementTagCount({
      fixture,
      tag: "article",
    });

    await measure("pages actions paste external html into body", async () => {
      await openNavigatorPanel({ page });
      await selectNavigatorItem({ page, itemName: "Body" });
      await pastePlainTextFromClipboardShortcut({ page, text: html });
    });
    await waitForCanvasText({ page, text: pastedHeading });
    await waitForCanvasText({ page, text: pastedLink });

    const pastedSectionCount = await getElementTagWithTextCount({
      fixture,
      tag: "section",
      text: pastedHeading,
    });
    const pastedArticleCount = await getElementTagWithTextCount({
      fixture,
      tag: "article",
      text: pastedLink,
    });
    if (pastedSectionCount !== 1) {
      throw new Error(
        `Expected pasted HTML to create one section containing "${pastedHeading}", found ${pastedSectionCount}`
      );
    }
    if (pastedArticleCount !== 1) {
      throw new Error(
        `Expected pasted HTML to create one article containing "${pastedLink}", found ${pastedArticleCount}`
      );
    }

    await measure("pages actions reload external html paste", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text: pastedHeading });
    await waitForCanvasText({ page, text: pastedLink });

    const reloadedSectionCount = await getElementTagCount({
      fixture,
      tag: "section",
    });
    const reloadedArticleCount = await getElementTagCount({
      fixture,
      tag: "article",
    });
    if (reloadedSectionCount !== initialSectionCount + 1) {
      throw new Error(
        `Expected reload to preserve pasted section. Before ${initialSectionCount}, after ${reloadedSectionCount}`
      );
    }
    if (reloadedArticleCount !== initialArticleCount + 1) {
      throw new Error(
        `Expected reload to preserve pasted article. Before ${initialArticleCount}, after ${reloadedArticleCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder can copy, duplicate, and delete a page from the header menu", async () => {
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
