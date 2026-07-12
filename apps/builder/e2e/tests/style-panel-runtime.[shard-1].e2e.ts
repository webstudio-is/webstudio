import type { Page } from "playwright";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import {
  waitForCanvasTextStyle,
  waitForHoveredCanvasTextStyle,
} from "../flows/canvas-style";
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

const readBuildStylesText = async (fixture: SeededContentModeProject) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  return JSON.stringify(JSON.parse(build.styles));
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

const expectBuildStylesNotToContain = async ({
  fixture,
  text,
}: {
  fixture: SeededContentModeProject;
  text: string;
}) => {
  const styles = await readBuildStylesText(fixture);
  if (styles.includes(text)) {
    throw new Error(`Expected build styles not to contain "${text}".`);
  }
};

test("Builder style panel edits representative styles and persists after reload", async () => {
  const fixture = await createStylePanelRuntimeProject("styles");
  const { page, close } = await newIsolatedPage();
  const text = "Initial content";

  try {
    await measure("style panel runtime open builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text });

    await selectCanvasTextInstance({ page, text });
    await page.getByRole("tab", { name: "Style" }).click();

    await measure("style panel runtime edit css values", async () => {
      await setCssValue({ page, property: "font-size", value: "44px" });
      await setCssValue({ page, property: "line-height", value: "1.25" });
      await setCssValue({ page, property: "letter-spacing", value: "2px" });
      await setCssValue({ page, property: "color", value: "#2255ff" });
      await setCssValue({ page, property: "width", value: "420px" });
      await selectStyleSourceState({ page, state: ":hover" });
      await setCssValue({ page, property: "color", value: "#ca126b" });
      await selectStyleSourceState({ page, state: ":hover" });
    });

    await waitForCanvasTextStyle({
      page,
      text,
      property: "font-size",
      value: "44px",
    });
    await waitForCanvasTextStyle({
      page,
      text,
      property: "line-height",
      value: "55px",
    });
    await waitForCanvasTextStyle({
      page,
      text,
      property: "letter-spacing",
      value: "2px",
    });
    await waitForCanvasTextStyle({
      page,
      text,
      property: "color",
      value: "rgb(34, 85, 255)",
    });
    await waitForCanvasTextStyle({
      page,
      text,
      property: "width",
      value: "420px",
    });
    await waitForHoveredCanvasTextStyle({
      page,
      text,
      property: "color",
      value: "rgb(202, 18, 107)",
    });
    await expectBuildStylesToContain({
      fixture,
      text: `"state":":hover"`,
    });

    await page.getByRole("tab", { name: "Style" }).click();
    await measure("style panel runtime reset css value", async () => {
      await resetCssValue({ page, property: "width" });
    });
    await expectBuildStylesNotToContain({
      fixture,
      text: `"property":"width"`,
    });

    await measure("style panel runtime reload builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasTextStyle({
      page,
      text,
      property: "font-size",
      value: "44px",
    });
    await waitForCanvasTextStyle({
      page,
      text,
      property: "line-height",
      value: "55px",
    });
    await waitForCanvasTextStyle({
      page,
      text,
      property: "letter-spacing",
      value: "2px",
    });
    await waitForCanvasTextStyle({
      page,
      text,
      property: "color",
      value: "rgb(34, 85, 255)",
    });
    await waitForHoveredCanvasTextStyle({
      page,
      text,
      property: "color",
      value: "rgb(202, 18, 107)",
    });
    await expectBuildStylesNotToContain({
      fixture,
      text: `"property":"width"`,
    });
    await expectBuildStylesToContain({
      fixture,
      text: `"state":":hover"`,
    });
  } finally {
    await close();
  }
});
