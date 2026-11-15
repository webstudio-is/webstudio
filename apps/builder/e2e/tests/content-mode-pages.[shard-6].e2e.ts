import { randomUUID } from "node:crypto";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { waitForCanvasTextStyle } from "../flows/canvas-style";
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
import { waitForSyncComplete } from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import type { SeededContentModeProject } from "../fixtures/content-mode-project";
import { test } from "../test";
import { measure } from "../perf";
import { e2ePaidPlanName } from "../plans";

let fixture: SeededContentModeProject;

test.beforeEach(async ({ context }) => {
  fixture = await createContentModeProject({
    context,
    devPlan: e2ePaidPlanName,
    email: `content-mode-pages-${randomUUID()}@webstudio.test`,
  });
});
test("Editor can create a styled page, edit allowed settings, and reload it in content mode", async ({
  page,
}) => {
  const pageName = "Created content page";
  const invalidPaths = ["/posts/:slug", "/docs/*", "https://x.com"];
  const editedName = "Edited settings content page";
  const editedPath = "/edited-settings-content-page";
  const editedTitle = "Edited settings title";
  const editedDescription = "Edited settings description";
  const editedLanguage = "en-US";
  const editedSocialImage = "https://example.com/content-mode-social.png";

  const expectTemplatedCanvas = async () => {
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
  };

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
  await waitForSyncComplete({ page });

  await measure("content mode create page from template", async () => {
    await createPageFromTemplate({
      page,
      templateName: fixture.pageTemplateName,
      pageName,
      canvasText: fixture.pageTemplateText,
    });
  });
  await expectTemplatedCanvas();
  await openPageSettings({ page, pageName });

  await test.step("Invalid paths and restricted settings are blocked", async () => {
    for (const path of invalidPaths) {
      const pathInput = getPageSettingsPathInput({ page });
      await pathInput.fill(path);
      await pathInput.blur();
      await expectContentModePagePathError({ page });
      await waitForSyncComplete({ page });
    }
    await expectContentModePageSettingsRestrictions({ page });
    await waitForSyncComplete({ page });
  });
  await test.step("Allowed settings can be saved", async () => {
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
  });

  await measure("content mode reload created page and settings", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
      mode: "content",
    });
    await openPage({
      page,
      pageName: editedName,
      canvasText: fixture.pageTemplateText,
    });
  });
  await expectTemplatedCanvas();
  await openPageSettings({ page, pageName: editedName });
  await page.getByLabel("Page name").waitFor();
  if ((await page.getByLabel("Page name").inputValue()) !== editedName) {
    throw new Error("Expected edited page name to persist");
  }
  if ((await getPageSettingsPathInput({ page }).inputValue()) !== editedPath) {
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
  await waitForSyncComplete({ page });
});
