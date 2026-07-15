import type { Page } from "playwright";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { waitForCanvasTextStyle } from "../flows/canvas-style";
import { openNavigatorPanel } from "../flows/navigator";
import {
  waitForChangeToBeSaved,
  waitForSyncStatus,
} from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import type { SeededContentModeProject } from "../fixtures/content-mode-project";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";
import { loadDevBuild } from "../db";

const createStylePanelRuntimeProject = async (name: string) => {
  return await createContentModeProject({
    email: `style-panel-runtime-${name}@webstudio.test`,
    title: `Style Panel Runtime ${name}`,
    assetNamePrefix: `style-panel-runtime-${name}-`,
    editorToken: `style-panel-runtime-${name}-editor-token`,
    builderToken: `style-panel-runtime-${name}-builder-token`,
  });
};

const setCssValue = async ({
  page,
  property,
  value,
}: {
  page: Page;
  property: string;
  value: string;
}) => {
  const input = page.getByLabel(property, { exact: true }).first();
  await input.fill(value);
  const save = waitForChangeToBeSaved({ page });
  await input.press("Enter");
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const addCssDeclaration = async ({
  page,
  css,
}: {
  page: Page;
  css: string;
}) => {
  const input = page.getByLabel("Add styles", { exact: true }).first();
  await input.fill(css);
  const save = waitForChangeToBeSaved({ page });
  await input.press("Enter");
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const selectNavigatorItem = async ({
  page,
  itemName,
}: {
  page: Page;
  itemName: string;
}) => {
  await openNavigatorPanel({ page });
  const item = page
    .locator("[data-navigator-tree] [data-tree-button]")
    .filter({ hasText: itemName })
    .last();
  await item.waitFor({ state: "visible" });
  await item.click();
  await item.click();
};

const readBuildStylesText = async (fixture: SeededContentModeProject) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  return JSON.stringify(JSON.parse(build.styles));
};

const getInstanceChildCount = async ({
  fixture,
  instanceId,
}: {
  fixture: SeededContentModeProject;
  instanceId: string;
}) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances = JSON.parse(build.instances) as Array<{
    id: string;
    children?: Array<{ type: string }>;
  }>;
  return (
    instances
      .find((instance) => instance.id === instanceId)
      ?.children?.filter((child) => child.type === "id").length ?? 0
  );
};

const expectBuildStylesToContain = async ({
  fixture,
  text,
}: {
  fixture: SeededContentModeProject;
  text: string;
}) => {
  const styles = await readBuildStylesText(fixture);
  if (styles.includes(text) === false) {
    throw new Error(`Expected build styles to contain "${text}".`);
  }
};

test("Builder grid generator fills selected grid and persists after reload", async () => {
  const fixture = await createStylePanelRuntimeProject("grid-generator");
  const { page, close } = await newIsolatedPage();
  const bodyInstanceId = "body";

  try {
    await measure(
      "style panel runtime open builder for grid generator",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });

    const initialBodyChildCount = await getInstanceChildCount({
      fixture,
      instanceId: bodyInstanceId,
    });

    await selectNavigatorItem({ page, itemName: "Body" });
    await page.getByRole("tab", { name: "Style" }).click();

    await measure("style panel runtime enable body grid", async () => {
      await addCssDeclaration({ page, css: "display: grid" });
    });
    await page.getByRole("button", { name: /Grid layout:/ }).waitFor();

    await measure("style panel runtime fill body grid", async () => {
      await page.getByRole("button", { name: /Grid layout:/ }).click();
      const save = waitForChangeToBeSaved({ page });
      await page.getByRole("button", { name: "Fill grid" }).click();
      await save;
      await waitForSyncStatus({ page, status: "idle" });
    });

    const filledBodyChildCount = await getInstanceChildCount({
      fixture,
      instanceId: bodyInstanceId,
    });
    const expectedBodyChildCount = Math.max(initialBodyChildCount, 4);
    if (filledBodyChildCount !== expectedBodyChildCount) {
      throw new Error(
        `Expected Fill grid to grow Body children to ${expectedBodyChildCount}. Before ${initialBodyChildCount}, after ${filledBodyChildCount}`
      );
    }
    await expectBuildStylesToContain({ fixture, text: `"display"` });
    await expectBuildStylesToContain({ fixture, text: `"grid"` });
    await expectBuildStylesToContain({ fixture, text: `"flexDirection"` });
    await expectBuildStylesToContain({ fixture, text: `"column"` });

    await measure(
      "style panel runtime reload grid generator result",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });
    await selectNavigatorItem({ page, itemName: "Body" });
    await page.getByRole("tab", { name: "Style" }).click();
    await page.getByRole("button", { name: /Grid layout:/ }).waitFor();

    const reloadedBodyChildCount = await getInstanceChildCount({
      fixture,
      instanceId: bodyInstanceId,
    });
    if (reloadedBodyChildCount !== expectedBodyChildCount) {
      throw new Error(
        `Expected reloaded Fill grid result to keep ${expectedBodyChildCount} Body children. Got ${reloadedBodyChildCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder breakpoint styles persist after create, update, reload, and delete", async () => {
  const fixture = await createStylePanelRuntimeProject("breakpoints");
  const { page, close } = await newIsolatedPage();
  const text = "Initial content";
  const breakpointName = "E2E Tablet";
  const updatedBreakpointName = "E2E Tablet Updated";

  try {
    await measure(
      "style panel runtime open builder for breakpoints",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text });

    await page
      .getByRole("button", { name: "Breakpoints with custom conditions" })
      .click();
    await page.getByRole("button", { name: "Edit breakpoints" }).click();
    await page.getByRole("button", { name: "Add breakpoint" }).click();

    const nameInput = page.getByPlaceholder("Breakpoint name").first();
    const nameSave = waitForChangeToBeSaved({ page });
    await nameInput.fill(breakpointName);
    await nameInput.blur();
    await nameSave;

    const renameSave = waitForChangeToBeSaved({ page });
    await nameInput.fill(updatedBreakpointName);
    await nameInput.blur();
    await renameSave;
    await waitForSyncStatus({ page, status: "idle" });

    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Breakpoints with custom conditions" })
      .click();
    await page.getByText(updatedBreakpointName, { exact: true }).click();

    await selectCanvasTextInstance({ page, text });
    await page.getByRole("tab", { name: "Style" }).click();
    await setCssValue({ page, property: "font-size", value: "31px" });

    await waitForCanvasTextStyle({
      page,
      text,
      property: "font-size",
      value: "31px",
    });

    await measure(
      "style panel runtime reload builder for breakpoint",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await page
      .getByRole("button", { name: "Breakpoints with custom conditions" })
      .click();
    await page.getByText(updatedBreakpointName, { exact: true }).click();
    await waitForCanvasTextStyle({
      page,
      text,
      property: "font-size",
      value: "31px",
    });

    await page
      .getByRole("button", { name: "Breakpoints with custom conditions" })
      .click();
    await page.getByRole("button", { name: "Edit breakpoints" }).click();
    await page.locator("[data-breakpoint-delete]").first().click({
      force: true,
    });
    const deleteSave = waitForChangeToBeSaved({ page });
    await page.getByRole("button", { name: "Delete" }).click();
    await deleteSave;
    await waitForSyncStatus({ page, status: "idle" });

    await measure(
      "style panel runtime reload builder after breakpoint delete",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await page.getByText(updatedBreakpointName, { exact: true }).waitFor({
      state: "hidden",
      timeout: 30_000,
    });
  } finally {
    await close();
  }
});

test("Builder design token styles persist after create and reload", async () => {
  const fixture = await createStylePanelRuntimeProject("tokens");
  const { page, close } = await newIsolatedPage();
  const text = "Initial content";
  const tokenName = "E2E Brand Token";

  try {
    await measure(
      "style panel runtime open builder for design tokens",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text });

    await selectCanvasTextInstance({ page, text });
    await page.getByRole("tab", { name: "Style" }).click();

    const styleSourceInput = page.getByLabel("New Style Source Input");
    await styleSourceInput.fill(tokenName);
    const createSave = waitForChangeToBeSaved({ page });
    await page.getByText(`Create ${tokenName}`, { exact: false }).click();
    await createSave;
    await waitForSyncStatus({ page, status: "idle" });
    await page.getByText(tokenName, { exact: true }).waitFor();

    await setCssValue({ page, property: "color", value: "#b4234c" });
    await waitForCanvasTextStyle({
      page,
      text,
      property: "color",
      value: "rgb(180, 35, 76)",
    });

    await measure(
      "style panel runtime reload builder for design token",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await selectCanvasTextInstance({ page, text });
    await page.getByRole("tab", { name: "Style" }).click();
    await page.getByText(tokenName, { exact: true }).waitFor();
    await waitForCanvasTextStyle({
      page,
      text,
      property: "color",
      value: "rgb(180, 35, 76)",
    });
  } finally {
    await close();
  }
});
