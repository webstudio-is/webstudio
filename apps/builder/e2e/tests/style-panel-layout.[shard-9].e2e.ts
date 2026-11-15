import { expect, type Page } from "@playwright/test";
import type { StyleSource, StyleSourceSelection } from "@webstudio-is/sdk";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { waitForCanvasTextStyle } from "../flows/canvas-style";
import { openNavigatorPanel } from "../flows/navigator";
import { addCssDeclaration } from "../flows/css-declaration";
import { waitForChangeToBeSaved } from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import type { SeededContentModeProject } from "../fixtures/content-mode-project";
import { test } from "../test";
import { measure } from "../perf";
import { loadDevBuild } from "../db";

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

test("Builder grid, design tokens, and custom breakpoint styles persist", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "style-panel-layout-e2e@webstudio.test",
    title: "Style Panel Layout E2E",
    assetNamePrefix: "style-panel-layout-e2e-",
  });
  const bodyInstanceId = "body";
  const breakpointText = "Initial content";
  const tokenText = fixture.shareLinkEditableText;
  const tokenInstanceId = "share-link-editable-content";
  const breakpointName = "E2E Tablet";
  const updatedBreakpointName = "E2E Tablet Updated";
  const tokenName = "E2E Brand Token";
  const openLayoutProject = () =>
    openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });

  const expectSavedToken = async () => {
    const build = await loadDevBuild({ projectId: fixture.projectId });
    const sources: StyleSource[] = JSON.parse(build.styleSources);
    const selections: StyleSourceSelection[] = JSON.parse(
      build.styleSourceSelections
    );
    const token = sources.find(
      (source) => source.type === "token" && source.name === tokenName
    );
    expect(token).toBeDefined();
    const selection = selections.find(
      ({ instanceId }) => instanceId === tokenInstanceId
    );
    expect(selection?.values).toContain(token?.id);
  };

  await openLayoutProject();
  await waitForCanvasText({ page, text: breakpointText });

  const initialBodyChildCount = await getInstanceChildCount({
    fixture,
    instanceId: bodyInstanceId,
  });
  const expectedBodyChildCount = Math.max(initialBodyChildCount, 4);

  await test.step("save styles on a design token", async () => {
    await selectCanvasTextInstance({ page, text: tokenText });
    await page.getByRole("tab", { name: "Style" }).click();

    const styleSourceInput = page.getByLabel("New style source input");
    await styleSourceInput.fill(tokenName);
    const createSave = waitForChangeToBeSaved({ page });
    await page.getByText(`Create ${tokenName}`, { exact: false }).click();
    await createSave;
    await page.getByText(tokenName, { exact: true }).waitFor();

    await setCssValue({ page, property: "color", value: "#b4234c" });
    await waitForCanvasTextStyle({
      page,
      text: tokenText,
      property: "color",
      value: "rgb(180, 35, 76)",
    });
    await expectSavedToken();
  });

  await test.step("fill the selected grid", async () => {
    await selectNavigatorItem({ page, itemName: "Body" });
    await page.getByRole("tab", { name: "Style" }).click();

    await measure("style panel runtime enable body grid", async () => {
      await addCssDeclaration({ page, property: "display", value: "grid" });
    });
    await page.getByRole("button", { name: /Grid layout:/ }).waitFor();

    await measure("style panel runtime fill body grid", async () => {
      await page.getByRole("button", { name: /Grid layout:/ }).click();
      const save = waitForChangeToBeSaved({ page });
      await page.getByRole("button", { name: "Fill grid" }).click();
      await save;
      await page.keyboard.press("Escape");
    });

    const filledBodyChildCount = await getInstanceChildCount({
      fixture,
      instanceId: bodyInstanceId,
    });
    if (filledBodyChildCount !== expectedBodyChildCount) {
      throw new Error(
        `Expected Fill grid to grow Body children to ${expectedBodyChildCount}. Before ${initialBodyChildCount}, after ${filledBodyChildCount}`
      );
    }
    const styles = await readBuildStylesText(fixture);
    expect(styles).toContain('"display"');
    expect(styles).toContain('"grid"');
    expect(styles).toContain('"flexDirection"');
    expect(styles).toContain('"column"');
  });

  await test.step("create, rename, and style a custom breakpoint", async () => {
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

    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Breakpoints with custom conditions" })
      .click();
    await page.getByText(updatedBreakpointName, { exact: true }).click();

    await selectCanvasTextInstance({ page, text: breakpointText });
    await page.getByRole("tab", { name: "Style" }).click();
    await setCssValue({ page, property: "font-size", value: "31px" });

    await waitForCanvasTextStyle({
      page,
      text: breakpointText,
      property: "font-size",
      value: "31px",
    });
  });

  await openLayoutProject();
  await waitForCanvasText({ page, text: breakpointText });

  await test.step("verify the reloaded design token and grid", async () => {
    await selectCanvasTextInstance({ page, text: tokenText });
    await page.getByRole("tab", { name: "Style" }).click();
    await page.getByText(tokenName, { exact: true }).waitFor();
    await waitForCanvasTextStyle({
      page,
      text: tokenText,
      property: "color",
      value: "rgb(180, 35, 76)",
    });
    await expectSavedToken();

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
  });

  await test.step("verify and remove the reloaded breakpoint", async () => {
    await page
      .getByRole("button", { name: "Breakpoints with custom conditions" })
      .click();
    await page.getByText(updatedBreakpointName, { exact: true }).click();
    await waitForCanvasTextStyle({
      page,
      text: breakpointText,
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
  });

  await openLayoutProject();
  await page
    .getByRole("button", { name: "Breakpoints with custom conditions" })
    .click();
  await page.getByRole("button", { name: "Edit breakpoints" }).waitFor();
  await page.getByText(updatedBreakpointName, { exact: true }).waitFor({
    state: "hidden",
  });
});
