import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { expectLocatorHidden } from "../flows/assertions";
import { waitForCanvasTextStyle } from "../flows/canvas-style";
import { replaceCanvasText } from "../flows/content-editing";
import {
  choosePageSettingsSocialImageAsset,
  createPageFromTemplate,
  expectContentModePagePathError,
  expectContentModePageSettingsRestrictions,
  expectCustomMetadataValue,
  fillAllowedPageSettings,
  fillCustomMetadata,
  getPageSettingsPathInput,
  openPage,
  openPageSettings,
} from "../flows/pages-panel";
import { waitForSyncStatus } from "../flows/sync-status";
import { insertTemplateAfterCanvasText } from "../flows/template-insertion";
import {
  getSharedContentModeProject,
  setupSharedContentModeProject,
} from "../fixtures/content-mode-suite";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";

test.beforeAll(async () => {
  await setupSharedContentModeProject();
});
test("Editor can create styled page from template in content mode", async () => {
  const fixture = getSharedContentModeProject();
  const { page, close } = await newIsolatedPage();
  const pageName = "Created content page";

  try {
    await measure(
      "content mode open editor for page template creation",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial link" });
    await waitForSyncStatus({ page, status: "idle" });

    await measure("content mode create page from template", async () => {
      await createPageFromTemplate({
        page,
        templateName: fixture.pageTemplateName,
        pageName,
        canvasText: fixture.pageTemplateText,
      });
    });
    await waitForCanvasTextStyle({
      page,
      text: fixture.pageTemplateText,
      property: "font-size",
      value: fixture.pageTemplateFontSize,
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
    await waitForCanvasText({
      page,
      text: "2026",
    });

    await measure(
      "content mode reload created page from template",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
        await openPage({
          page,
          pageName,
          canvasText: fixture.pageTemplateText,
        });
      }
    );
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
    await waitForCanvasText({
      page,
      text: "2026",
    });
    await waitForSyncStatus({ page, status: "idle" });
  } finally {
    await close();
  }
});

test("Editor can edit allowed page settings", async () => {
  const fixture = getSharedContentModeProject();
  const { page, close } = await newIsolatedPage();
  const pageName = "Settings content page";
  const editedName = "Edited settings content page";
  const editedPath = "/edited-settings-content-page";
  const editedTitle = "Edited settings title";
  const editedDescription = "Edited settings description";
  const editedLanguage = "en-US";
  const editedSocialImage = "https://example.com/content-mode-social.png";

  try {
    await measure(
      "content mode open editor for allowed page settings",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial link" });
    await waitForSyncStatus({ page, status: "idle" });

    await createPageFromTemplate({
      page,
      templateName: fixture.pageTemplateName,
      pageName,
      canvasText: fixture.pageTemplateText,
    });
    await openPageSettings({ page, pageName });

    await fillAllowedPageSettings({
      page,
      name: editedName,
      path: editedPath,
      title: editedTitle,
      description: editedDescription,
      language: editedLanguage,
      socialImage: editedSocialImage,
      metadata: {
        property: "content-mode",
        content: "edited metadata",
      },
    });
    await choosePageSettingsSocialImageAsset({
      page,
      filename: fixture.assetTemplateImageName,
      label: fixture.assetTemplateImageAlt,
    });
    await fillCustomMetadata({
      page,
      metadata: {
        property: "content-mode",
        content: "edited metadata",
      },
    });

    await measure(
      "content mode reload editor for allowed page settings",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await openPageSettings({ page, pageName: editedName });
    await page.getByLabel("Page name").waitFor();
    if ((await page.getByLabel("Page name").inputValue()) !== editedName) {
      throw new Error("Expected edited page name to persist");
    }
    if (
      (await getPageSettingsPathInput({ page }).inputValue()) !== editedPath
    ) {
      throw new Error("Expected edited page path to persist");
    }
    if ((await page.getByLabel("Title").inputValue()) !== editedTitle) {
      throw new Error("Expected edited page title to persist");
    }
    if (
      (await page.getByLabel("Description").inputValue()) !== editedDescription
    ) {
      throw new Error("Expected edited page description to persist");
    }
    if (
      (await page
        .getByLabel("Exclude this page from search results")
        .isChecked()) === false
    ) {
      throw new Error("Expected edited search visibility to persist");
    }
    if ((await page.getByLabel("Language").inputValue()) !== editedLanguage) {
      throw new Error("Expected edited page language to persist");
    }
    const socialPreviewImage = page.getByRole("img", {
      name: "Social sharing preview image",
    });
    await socialPreviewImage.waitFor();
    const socialPreviewImageSrc = await socialPreviewImage.getAttribute("src");
    if (
      socialPreviewImageSrc?.includes(fixture.assetTemplateImageName) !== true
    ) {
      throw new Error(
        `Expected social image preview to render ${fixture.assetTemplateImageName}, received ${socialPreviewImageSrc}`
      );
    }
    await expectCustomMetadataValue({
      page,
      property: "content-mode",
      content: "edited metadata",
    });
    await waitForSyncStatus({ page, status: "idle" });
  } finally {
    await close();
  }
});

test("Editor is blocked from invalid paths and restricted page settings", async () => {
  const fixture = getSharedContentModeProject();
  const { page, close } = await newIsolatedPage();
  const pageName = "Blocked settings content page";
  const invalidPaths = ["/posts/:slug", "/docs/*", "https://x.com"];

  try {
    await measure(
      "content mode open editor for blocked page paths",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial link" });
    await waitForSyncStatus({ page, status: "idle" });

    await createPageFromTemplate({
      page,
      templateName: fixture.pageTemplateName,
      pageName,
      canvasText: fixture.pageTemplateText,
    });
    await openPageSettings({ page, pageName });

    for (const path of invalidPaths) {
      const pathInput = getPageSettingsPathInput({ page });
      await pathInput.fill(path);
      await pathInput.blur();
      await expectContentModePagePathError({ page });
      await waitForSyncStatus({ page, status: "idle" });
    }
    await expectContentModePageSettingsRestrictions({ page });
    await waitForSyncStatus({ page, status: "idle" });
  } finally {
    await close();
  }
});

test("Edit-only and build-capable users can collaborate in content mode", async () => {
  const fixture = getSharedContentModeProject();
  const editor = await newIsolatedPage();
  const builder = await newIsolatedPage();

  try {
    await measure("open editor and builder sessions", async () => {
      await Promise.all([
        openProjectBuilder({
          page: editor.page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        }),
        openProjectBuilder({
          page: builder.page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        }),
      ]);
    });
    await waitForCanvasText({ page: editor.page, text: "Initial content" });
    await waitForCanvasText({ page: builder.page, text: "Initial content" });
    await waitForSyncStatus({ page: editor.page, status: "idle" });
    await waitForSyncStatus({ page: builder.page, status: "idle" });

    await insertTemplateAfterCanvasText({
      page: editor.page,
      anchorText: "Initial content",
      templateName: fixture.collaborationTemplateName,
    });
    await waitForCanvasText({
      page: editor.page,
      text: fixture.collaborationTemplateText,
    });
    await waitForSyncStatus({ page: editor.page, status: "idle" });

    await openProjectBuilder({
      page: builder.page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await waitForCanvasText({
      page: builder.page,
      text: fixture.collaborationTemplateText,
    });

    await replaceCanvasText({
      page: editor.page,
      currentText: fixture.collaborationTemplateText,
      text: "Collaborative editor text",
    });
    await waitForSyncStatus({ page: editor.page, status: "idle" });

    await selectCanvasTextInstance({
      page: editor.page,
      text: "Collaborative editor text",
    });
    await expectLocatorHidden({
      locator: editor.page.getByRole("tab", { name: "Style" }),
      message:
        "Expected edit-only collaborator to be blocked from design controls",
    });

    await openProjectBuilder({
      page: builder.page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await waitForCanvasText({
      page: builder.page,
      text: "Collaborative editor text",
    });

    await selectCanvasTextInstance({
      page: builder.page,
      text: "Collaborative editor text",
    });
    await builder.page
      .getByRole("tab", { name: "Style" })
      .waitFor({ state: "visible" });
    await waitForSyncStatus({ page: editor.page, status: "idle" });
    await waitForSyncStatus({ page: builder.page, status: "idle" });
  } finally {
    await editor.close();
    await builder.close();
  }
});
