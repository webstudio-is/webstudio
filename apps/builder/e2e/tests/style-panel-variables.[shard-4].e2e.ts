import { expect, type BrowserContext, type Page } from "@playwright/test";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { waitForCanvasTextStyle } from "../flows/canvas-style";
import { waitForChangeToBeSaved } from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import type { SeededContentModeProject } from "../fixtures/content-mode-project";
import { test } from "../test";
import { measure } from "../perf";
import { loadDevBuild } from "../db";

const createStylePanelRuntimeProject = async (
  context: BrowserContext,
  name: string
) => {
  return await createContentModeProject({
    context,
    email: `style-panel-runtime-${name}@webstudio.test`,
    title: `Style Panel Runtime ${name}`,
    assetNamePrefix: `style-panel-runtime-${name}-`,
    editorToken: `style-panel-runtime-${name}-editor-token`,
    builderToken: `style-panel-runtime-${name}-builder-token`,
  });
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
  await page.getByRole("button", { name: "Menu", exact: true }).click();
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

test("Builder CSS variables persist across create, bind, rename, delete, and reload", async ({
  page,
  context,
}) => {
  const fixture = await createStylePanelRuntimeProject(
    context,
    "css-variables"
  );
  const text = "Initial content";
  const variableName = "--e2e-brand-color";
  const renamedVariableName = "--e2e-brand-color-renamed";

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
      const editor = page.getByRole("textbox", {
        name: "Styles",
        exact: true,
      });
      await editor.click();
      await editor.press("ControlOrMeta+Home");
      await editor.press("ArrowDown");
      await page.keyboard.insertText(
        `${variableName}: #126bca;\ncolor: var(${variableName});\n`
      );
      const save = waitForChangeToBeSaved({ page });
      await editor.press("ControlOrMeta+Enter");
      await save;
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
    const dialog = page.getByRole("dialog", { name: "Rename CSS variable" });
    await dialog.getByRole("textbox").fill(renamedVariableName);
    const save = waitForChangeToBeSaved({ page });
    await dialog.getByRole("button", { name: "Rename" }).click();
    await save;
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
  });

  await expectBuildStylesNotToContain({
    fixture,
    text: renamedVariableName,
  });

  const canvas = await measure(
    "style panel runtime reload builder after css variable delete",
    () =>
      openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      })
  );
  await expect(canvas.getByText(text, { exact: true })).toHaveCSS(
    renamedVariableName,
    ""
  );
});
