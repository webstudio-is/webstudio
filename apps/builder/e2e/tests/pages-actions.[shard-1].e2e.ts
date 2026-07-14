import type { Page } from "playwright";
import {
  openProjectBuilder,
  waitForCanvasText,
  waitForCanvasTextHidden,
} from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { openNavigatorPanel } from "../flows/navigator";
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
