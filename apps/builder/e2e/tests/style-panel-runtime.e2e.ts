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

const runCssVariableCommandAction = async ({
  page,
  variable,
  action,
}: {
  page: Page;
  variable: string;
  action: "Rename" | "Delete";
}) => {
  await page.getByRole("button", { name: "Menu Button" }).click();
  await page.getByRole("menuitem", { name: "Search & commands" }).click();
  const input = page
    .getByPlaceholder("Type a command or search...", { exact: true })
    .first();
  await input.waitFor();
  await input.fill(variable);
  await page
    .locator("[cmdk-item]")
    .filter({ hasText: variable })
    .first()
    .waitFor();
  await input.press("Tab");
  await page
    .locator("[data-action-list]")
    .getByText(action, { exact: true })
    .click();
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
  } finally {
    await close();
  }
});

test("Builder CSS variables persist across create, bind, rename, delete, and reload", async () => {
  const fixture = await createStylePanelRuntimeProject("css-variables");
  const { page, close } = await newIsolatedPage();
  const text = "Initial content";
  const variableName = "--e2e-brand-color";
  const renamedVariableName = "--e2e-brand-color-renamed";

  try {
    await measure(
      "style panel runtime open builder for css variables",
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

    await measure(
      "style panel runtime create and bind css variable",
      async () => {
        await addCssDeclaration({
          page,
          css: `${variableName}: #126bca`,
        });
        await addCssDeclaration({
          page,
          css: `color: var(${variableName})`,
        });
      }
    );

    await waitForCanvasTextStyle({
      page,
      text,
      property: "color",
      value: "rgb(18, 107, 202)",
    });
    await expectBuildStylesToContain({
      fixture,
      text: `"property":"${variableName}"`,
    });
    await expectBuildStylesToContain({
      fixture,
      text: `var","value":"${variableName.slice(2)}`,
    });

    await measure(
      "style panel runtime reload builder for css variable",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasTextStyle({
      page,
      text,
      property: "color",
      value: "rgb(18, 107, 202)",
    });

    await measure("style panel runtime rename css variable", async () => {
      await runCssVariableCommandAction({
        page,
        variable: variableName,
        action: "Rename",
      });
      const dialog = page.getByRole("dialog", { name: "Rename CSS Variable" });
      await dialog.getByRole("textbox").fill(renamedVariableName);
      const save = waitForChangeToBeSaved({ page });
      await dialog.getByRole("button", { name: "Rename" }).click();
      await save;
      await waitForSyncStatus({ page, status: "idle" });
    });

    await waitForCanvasTextStyle({
      page,
      text,
      property: "color",
      value: "rgb(18, 107, 202)",
    });
    await expectBuildStylesNotToContain({
      fixture,
      text: `"property":"${variableName}"`,
    });
    await expectBuildStylesToContain({
      fixture,
      text: `"property":"${renamedVariableName}"`,
    });
    await expectBuildStylesToContain({
      fixture,
      text: `var","value":"${renamedVariableName.slice(2)}`,
    });

    await measure(
      "style panel runtime reload builder after css variable rename",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasTextStyle({
      page,
      text,
      property: "color",
      value: "rgb(18, 107, 202)",
    });

    await measure("style panel runtime delete css variable", async () => {
      await runCssVariableCommandAction({
        page,
        variable: renamedVariableName,
        action: "Delete",
      });
      const save = waitForChangeToBeSaved({ page });
      await page
        .getByRole("dialog", { name: "Delete confirmation" })
        .getByRole("button", { name: "Delete" })
        .click();
      await save;
      await waitForSyncStatus({ page, status: "idle" });
    });

    await expectBuildStylesNotToContain({
      fixture,
      text: renamedVariableName,
    });

    await measure(
      "style panel runtime reload builder after css variable delete",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await expectBuildStylesNotToContain({
      fixture,
      text: renamedVariableName,
    });
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
