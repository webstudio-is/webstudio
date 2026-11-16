import { expect, type Page } from "@playwright/test";
import type {
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import {
  waitForCanvasTextStyle,
  waitForHoveredCanvasTextStyle,
} from "../flows/canvas-style";
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
  waitForSave = true,
}: {
  page: Page;
  property: string;
  value: string;
  waitForSave?: boolean;
}) => {
  const input = page.getByLabel(property, { exact: true }).first();
  await input.fill(value);
  const save = waitForSave ? waitForChangeToBeSaved({ page }) : undefined;
  await input.press("Enter");
  await save;
};

const resetCssValue = async ({
  page,
  property,
}: {
  page: Page;
  property: string;
}) => {
  const input = page.getByLabel(property, { exact: true }).first();
  const labelText = `${property.slice(0, 1).toUpperCase()}${property.slice(1)}`;
  const control = input.locator(
    `xpath=ancestor::*[.//*[normalize-space()=${JSON.stringify(labelText)}]][1]`
  );
  const label = control.getByText(labelText, { exact: true });
  await label.waitFor({ state: "visible", timeout: 10_000 });
  const save = waitForChangeToBeSaved({ page });
  await label.click({ modifiers: ["Alt"] });
  await save;
};

const selectStyleSourceState = async ({
  page,
  state,
}: {
  page: Page;
  state: string;
}) => {
  await page
    .getByLabel("Style source menu Local", { exact: true })
    .click({ force: true });
  await page.getByRole("menuitem", { name: state, exact: true }).click();
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

test("Builder style properties, grid, tokens, and custom breakpoints persist", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "style-panel-e2e@webstudio.test",
    title: "Style Panel E2E",
    assetNamePrefix: "style-panel-e2e-",
  });
  const bodyInstanceId = "body";
  const styledText = "Initial content";
  const tokenText = fixture.shareLinkEditableText;
  const tokenInstanceId = "share-link-editable-content";
  const breakpointName = "E2E Tablet";
  const updatedBreakpointName = "E2E Tablet Updated";
  const tokenName = "E2E Brand Token";
  const openStyleProject = () =>
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

  const representativeStyles = [
    { property: "font-size", value: "44px", computed: "44px" },
    { property: "line-height", value: "1.25", computed: "55px" },
    { property: "letter-spacing", value: "2px", computed: "2px" },
    { property: "color", value: "#2255ff", computed: "rgb(34, 85, 255)" },
  ];
  const expectRepresentativeCanvasStyles = async () => {
    for (const { property, computed } of representativeStyles) {
      await waitForCanvasTextStyle({
        page,
        text: styledText,
        property,
        value: computed,
      });
    }
  };
  const expectHoverCanvasStyle = () =>
    waitForHoveredCanvasTextStyle({
      page,
      text: styledText,
      property: "color",
      value: "rgb(202, 18, 107)",
    });
  const readSavedInstanceStyles = async () => {
    const build = await loadDevBuild({ projectId: fixture.projectId });
    const styles: StyleDecl[] = JSON.parse(build.styles);
    const selections: StyleSourceSelection[] = JSON.parse(
      build.styleSourceSelections
    );
    const selection = selections.find(
      ({ instanceId }) => instanceId === fixture.listItemInstanceId
    );
    return styles.filter(({ styleSourceId }) =>
      selection?.values.includes(styleSourceId)
    );
  };
  const hoverColor = expect.objectContaining({
    state: ":hover",
    property: "color",
  });
  const width = expect.objectContaining({ property: "width" });

  await openStyleProject();
  await waitForCanvasText({ page, text: styledText });

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
    await page.getByText(`Create ${tokenName}`, { exact: false }).click();
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

  await test.step("edit and reset representative style properties", async () => {
    await selectCanvasTextInstance({ page, text: styledText });
    await page.getByRole("tab", { name: "Style" }).click();
    for (const { property, value } of representativeStyles) {
      await setCssValue({ page, property, value, waitForSave: false });
    }
    await setCssValue({
      page,
      property: "width",
      value: "420px",
      waitForSave: false,
    });
    await selectStyleSourceState({ page, state: ":hover" });
    await setCssValue({ page, property: "color", value: "#ca126b" });
    await selectStyleSourceState({ page, state: ":hover" });

    await expectRepresentativeCanvasStyles();
    await waitForCanvasTextStyle({
      page,
      text: styledText,
      property: "width",
      value: "420px",
    });
    await expectHoverCanvasStyle();
    expect(await readSavedInstanceStyles()).toContainEqual(hoverColor);

    await page.getByRole("tab", { name: "Style" }).click();
    await resetCssValue({ page, property: "width" });
    expect(await readSavedInstanceStyles()).not.toContainEqual(width);
  });

  await test.step("fill the selected grid", async () => {
    await selectNavigatorItem({ page, itemName: "Body" });
    await page.getByRole("tab", { name: "Style" }).click();

    const gridLayout = page.getByRole("button", { name: /Grid layout:/ });
    await expect(gridLayout).toBeHidden();
    await Promise.all([
      measure("style panel runtime enable body grid", () =>
        addCssDeclaration({ page, property: "display", value: "grid" })
      ),
      measure("style panel runtime fill body grid", async () => {
        await gridLayout.click();
        await page.getByRole("button", { name: "Fill grid" }).click();
        // The display declaration may save before the new children.
        await expect
          .poll(
            () =>
              getInstanceChildCount({
                fixture,
                instanceId: bodyInstanceId,
              }),
            { message: "Fill grid saves the new Body children" }
          )
          .toBe(expectedBodyChildCount);
        await page.keyboard.press("Escape");
      }),
    ]);

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

    await nameInput.fill(updatedBreakpointName);
    await nameInput.blur();

    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Breakpoints with custom conditions" })
      .click();
    await page.getByText(updatedBreakpointName, { exact: true }).click();

    await selectCanvasTextInstance({ page, text: styledText });
    await page.getByRole("tab", { name: "Style" }).click();
    await setCssValue({ page, property: "font-size", value: "31px" });

    await waitForCanvasTextStyle({
      page,
      text: styledText,
      property: "font-size",
      value: "31px",
    });
  });

  await openStyleProject();
  await waitForCanvasText({ page, text: styledText });

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
      text: styledText,
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

  await openStyleProject();
  await page
    .getByRole("button", { name: "Breakpoints with custom conditions" })
    .click();
  await page.getByRole("button", { name: "Edit breakpoints" }).waitFor();
  await page.getByText(updatedBreakpointName, { exact: true }).waitFor({
    state: "hidden",
  });
  await page.keyboard.press("Escape");

  // The new breakpoint has a minimum width of 0. Check the base font size
  // once its override has been removed.
  await test.step("verify the reloaded style properties", async () => {
    await expectRepresentativeCanvasStyles();
    await expectHoverCanvasStyle();
    await page.mouse.move(0, 0);
    const styles = await readSavedInstanceStyles();
    expect(styles).toContainEqual(hoverColor);
    expect(styles).not.toContainEqual(width);
  });
});
