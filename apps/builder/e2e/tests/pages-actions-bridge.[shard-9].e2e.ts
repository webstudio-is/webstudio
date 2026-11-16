import { expect, type Page } from "@playwright/test";
import {
  openProjectBuilder,
  waitForCanvasText,
  waitForCanvasTextHidden,
} from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { openNavigatorPanel } from "../flows/navigator";
import {
  waitForChangeToBeSaved,
  waitForSyncComplete,
} from "../flows/sync-status";
import { insertTemplateAfterCanvasText } from "../flows/template-insertion";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import type { SeededContentModeProject } from "../fixtures/content-mode-project";
import { test, withBrowserContext } from "../test";
import { measure } from "../perf";
import { e2ePaidPlanName } from "../plans";
import { loadDevBuild } from "../db";

test.describe.configure({ mode: "parallel" });

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
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const menuItem = page.getByRole("menuitem", { name });
  await menuItem.waitFor();
  await menuItem.click();
};

const selectSavedAppMenuItem = async ({
  page,
  name,
}: {
  page: Page;
  name: "Undo" | "Redo";
}) => {
  await Promise.all([
    waitForChangeToBeSaved({ page, timeout: 30_000 }),
    selectAppMenuItem({ page, name }),
  ]);
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
};

test.beforeEach(async ({ browser }) => {
  fixture = await withBrowserContext(browser, (context) =>
    createContentModeProject({
      context,
      devPlan: e2ePaidPlanName,
      email: "pages-actions-e2e@webstudio.test",
      title: "Pages Actions E2E",
      assetNamePrefix: "pages-actions-",
      editorToken: "pages-actions-e2e-editor-token",
      builderToken: "pages-actions-e2e-builder-token",
    })
  );
});

test("Builder filters the catalog and persists component actions from shortcuts and Navigator", async ({
  page,
}) => {
  const componentName = "Image";
  const insertedButtonText = "Button";

  await measure("pages actions open builder for command panel", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
  });
  await waitForCanvasText({ page, text: "Initial content" });
  await selectCanvasTextInstance({ page, text: "Initial content" });

  await test.step("filter the components catalog and insert a Button", async () => {
    await openComponentsPanel({ page });
    await expectComponentPanelOptionHidden({ page, name: "Body" });
    await insertComponentPanelOption({ page, name: "Button" });
    await waitForCanvasText({ page, text: insertedButtonText });
  });
  await selectCanvasTextInstance({ page, text: "Initial content" });

  const readComponentCount = () =>
    getInstanceComponentCount({ fixture, component: componentName });
  const initialCount = await readComponentCount();
  // The persisted count is available before the sync indicator returns to idle.
  const expectSavedComponentCount = (count: number, action: string) =>
    expect
      .poll(readComponentCount, {
        message: action,
        intervals: [100, 250],
        timeout: 10_000,
      })
      .toBe(count);

  await measure(
    "pages actions insert component before command duplicate",
    async () => {
      await openComponentsPanel({ page });
      await insertComponentPanelOption({ page, name: componentName });
      await expectSavedComponentCount(initialCount + 1, "Insert one Image");
    }
  );

  await measure("pages actions duplicate inserted component", async () => {
    await page.keyboard.press("ControlOrMeta+D");
    await expectSavedComponentCount(initialCount + 2, "Duplicate the Image");
  });

  await measure("pages actions undo duplicate command", async () => {
    await selectAppMenuItem({ page, name: "Undo" });
    await expectSavedComponentCount(initialCount + 1, "Undo the shortcut");
  });

  await measure("pages actions redo duplicate command", async () => {
    await selectAppMenuItem({ page, name: "Redo" });
    await expectSavedComponentCount(initialCount + 2, "Redo the shortcut");
  });

  await measure(
    "pages actions duplicate component from navigator",
    async () => {
      await openNavigatorPanel({ page });
      await selectNavigatorContextAction({
        page,
        itemName: componentName,
        action: "Duplicate",
      });
      try {
        await expectSavedComponentCount(
          initialCount + 3,
          "Duplicate from Navigator"
        );
      } catch (error) {
        throw new Error(
          `Components: ${await getInstanceComponentCountSummary(fixture)}. Navigator: ${JSON.stringify(await getNavigatorButtonSummary({ page, text: componentName }))}`,
          { cause: error }
        );
      }
    }
  );

  await measure("pages actions undo navigator duplicate", async () => {
    await selectAppMenuItem({ page, name: "Undo" });
    await expectSavedComponentCount(
      initialCount + 2,
      "Undo Navigator duplicate"
    );
  });

  await measure("pages actions redo navigator duplicate", async () => {
    await selectAppMenuItem({ page, name: "Redo" });
    await expectSavedComponentCount(
      initialCount + 3,
      "Redo Navigator duplicate"
    );
  });

  await measure("pages actions delete component from navigator", async () => {
    await openNavigatorPanel({ page });
    await selectNavigatorContextAction({
      page,
      itemName: componentName,
      action: "Delete",
    });
    await expectSavedComponentCount(initialCount + 2, "Delete from Navigator");
  });

  await measure("pages actions undo navigator delete", async () => {
    await selectAppMenuItem({ page, name: "Undo" });
    await expectSavedComponentCount(initialCount + 3, "Undo Navigator delete");
    await waitForSyncComplete({ page });
  });

  await measure("pages actions reload component mutations", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
  });
  await waitForCanvasText({ page, text: insertedButtonText });
  expect(await readComponentCount()).toBe(initialCount + 3);
});

test("Builder can insert through the engine bridge, undo, redo, and reload", async ({
  page,
}) => {
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
    await selectSavedAppMenuItem({ page, name: "Undo" });
  });
  await waitForCanvasTextHidden({
    page,
    text: fixture.styledHeadingTemplateText,
  });

  await measure("pages actions redo bridge insert", async () => {
    await selectSavedAppMenuItem({ page, name: "Redo" });
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
});
