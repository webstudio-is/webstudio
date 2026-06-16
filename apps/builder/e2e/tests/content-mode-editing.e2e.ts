import {
  deleteSelectedAsset,
  openAssetDetails,
  openAssetsPanel,
  replaceSelectedAsset,
  uploadAsset,
} from "../flows/assets-panel";
import { deleteContentBlockChildAfterCanvasText } from "../flows/block-outline";
import {
  openProjectBuilder,
  waitForCanvasFrame,
  waitForCanvasText,
  waitForCanvasTextHidden,
} from "../flows/builder";
import {
  selectCanvasTextInstance,
  selectCanvasTextInstanceForProps,
} from "../flows/canvas-selection";
import { expectLocatorHidden, expectTextHidden } from "../flows/assertions";
import {
  selectCanvasImage,
  selectCanvasVideoSource,
  waitForCanvasImage,
  waitForCanvasImageSourceName,
  waitForCanvasVideoSource,
} from "../flows/canvas-media";
import {
  waitForCanvasTextStyle,
  waitForCanvasTextStyleCount,
} from "../flows/canvas-style";
import { replaceCanvasText } from "../flows/content-editing";
import {
  chooseSelectedAssetProperty,
  fillSelectedStringProperty,
  waitForSelectedStringPropertyValue,
} from "../flows/props-panel";
import {
  choosePageSettingsSocialImageAsset,
  createPageFromTemplate,
  expectContentModePagePathError,
  expectContentModePageSettingsRestrictions,
  expectContentModeTemplateActionsUnavailable,
  expectCustomMetadataValue,
  fillAllowedPageSettings,
  getPageSettingsPathInput,
  openPage,
  openPageSettings,
  openPagesPanel,
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
test("Editor can insert content templates with assets and styles", async () => {
  const fixture = getSharedContentModeProject();
  const { page, close } = await newIsolatedPage();

  try {
    await measure("content mode open editor for asset template", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.editorToken,
        mode: "content",
      });
    });
    await waitForCanvasText({ page, text: "Initial content" });
    await waitForSyncStatus({ page, status: "idle" });

    await measure("content mode insert asset template", async () => {
      await insertTemplateAfterCanvasText({
        page,
        anchorText: "Initial content",
        templateName: fixture.assetTemplateName,
      });
    });
    await waitForCanvasImage({
      page,
      alt: fixture.assetTemplateImageAlt,
    });
    await waitForCanvasVideoSource({
      page,
      sourceName: fixture.assetTemplateVideoName,
    });

    await measure("content mode insert heading template", async () => {
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
    await waitForCanvasTextStyle({
      page,
      text: fixture.styledHeadingTemplateText,
      property: "font-size",
      value: fixture.styledHeadingTemplateFontSize,
    });

    await measure("content mode insert token template", async () => {
      await insertTemplateAfterCanvasText({
        page,
        anchorText: "Initial content",
        templateName: fixture.tokenTemplateName,
      });
    });
    await waitForCanvasText({
      page,
      text: fixture.tokenTemplateText,
    });
    await waitForCanvasTextStyle({
      page,
      text: fixture.tokenTemplateText,
      property: "font-size",
      value: fixture.tokenTemplateFontSize,
    });

    await measure("content mode insert local style templates", async () => {
      await insertTemplateAfterCanvasText({
        page,
        anchorText: "Initial content",
        templateName: fixture.isolatedLocalTemplateName,
      });
      await insertTemplateAfterCanvasText({
        page,
        anchorText: "Initial content",
        templateName: fixture.isolatedLocalTemplateName,
      });
    });
    await waitForCanvasTextStyleCount({
      page,
      text: fixture.isolatedLocalTemplateText,
      property: "font-size",
      value: fixture.isolatedLocalTemplateFontSize,
      count: 2,
    });

    await measure("content mode reload editor for asset template", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.editorToken,
        mode: "content",
      });
    });
    await waitForCanvasImage({
      page,
      alt: fixture.assetTemplateImageAlt,
    });
    await waitForCanvasVideoSource({
      page,
      sourceName: fixture.assetTemplateVideoName,
    });
    await waitForCanvasTextStyle({
      page,
      text: fixture.styledHeadingTemplateText,
      property: "font-size",
      value: fixture.styledHeadingTemplateFontSize,
    });
    await waitForCanvasTextStyle({
      page,
      text: fixture.tokenTemplateText,
      property: "font-size",
      value: fixture.tokenTemplateFontSize,
    });
    await waitForCanvasTextStyleCount({
      page,
      text: fixture.isolatedLocalTemplateText,
      property: "font-size",
      value: fixture.isolatedLocalTemplateFontSize,
      count: 2,
    });
    await waitForSyncStatus({ page, status: "idle" });
  } finally {
    await close();
  }
});
test("Editor can upload, replace, and delete asset in content mode", async () => {
  const fixture = getSharedContentModeProject();
  const { page, close } = await newIsolatedPage();
  const uploadFilename = "upload-image.svg";
  const replacementFilename = "replacement-image.svg";

  try {
    await measure("content mode open editor for asset workflows", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.editorToken,
        mode: "content",
      });
    });
    await waitForCanvasText({ page, text: "Initial content" });
    await waitForSyncStatus({ page, status: "idle" });

    let uploadedAssetTitle = "";
    await measure("content mode upload asset", async () => {
      await openAssetsPanel({ page });
      uploadedAssetTitle = await uploadAsset({
        page,
        filename: uploadFilename,
      });
    });

    let replacementAssetTitle = "";
    await measure("content mode replace asset", async () => {
      await openAssetDetails({ page, filename: uploadedAssetTitle });
      replacementAssetTitle = await replaceSelectedAsset({
        page,
        filename: replacementFilename,
      });
    });

    await measure("content mode delete asset", async () => {
      await openAssetDetails({ page, filename: replacementAssetTitle });
      await deleteSelectedAsset({
        page,
        filename: replacementAssetTitle,
      });
    });

    await measure(
      "content mode reload editor for asset workflows",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await openAssetsPanel({ page });
    await page.getByTitle(uploadedAssetTitle).waitFor({ state: "hidden" });
    await page.getByTitle(replacementAssetTitle).waitFor({ state: "hidden" });
    await waitForSyncStatus({ page, status: "idle" });
  } finally {
    await close();
  }
});
test("Editor can replace image source with asset in content mode", async () => {
  const fixture = getSharedContentModeProject();
  const { page, close } = await newIsolatedPage();
  const uploadFilename = "upload-image.svg";
  const replacementFilename = "replacement-image.svg";

  try {
    await measure(
      "content mode open editor for image source asset replacement",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });
    await waitForSyncStatus({ page, status: "idle" });

    await insertTemplateAfterCanvasText({
      page,
      anchorText: "Initial content",
      templateName: fixture.imageReplacementTemplateName,
    });
    await waitForCanvasImage({
      page,
      alt: fixture.imageReplacementTemplateImageAlt,
    });

    let uploadedAssetTitle = "";
    await measure("content mode upload image source asset", async () => {
      await openAssetsPanel({ page });
      uploadedAssetTitle = await uploadAsset({
        page,
        filename: uploadFilename,
      });
    });

    await selectCanvasImage({
      page,
      alt: fixture.imageReplacementTemplateImageAlt,
    });
    await measure("content mode choose image source asset", async () => {
      await chooseSelectedAssetProperty({
        page,
        label: "Source",
        assetFilename: uploadFilename,
      });
    });
    await waitForCanvasImageSourceName({ page, sourceName: "upload-image_" });

    let replacementAssetTitle = "";
    await measure("content mode replace used image source asset", async () => {
      await openAssetsPanel({ page });
      await openAssetDetails({
        page,
        filename: uploadedAssetTitle,
      });
      replacementAssetTitle = await replaceSelectedAsset({
        page,
        filename: replacementFilename,
      });
    });
    await waitForCanvasImageSourceName({
      page,
      sourceName: "replacement-image_",
    });

    await measure(
      "content mode reload editor for image source asset replacement",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await waitForCanvasImageSourceName({
      page,
      sourceName: "replacement-image_",
    });
    await openAssetsPanel({ page });
    await page.getByTitle(replacementAssetTitle).waitFor();
    await waitForSyncStatus({ page, status: "idle" });
  } finally {
    await close();
  }
});
test("Editor can delete direct children but not protected containers", async () => {
  const fixture = getSharedContentModeProject();
  const { page, close } = await newIsolatedPage();

  try {
    await measure(
      "content mode open editor for direct child delete",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });
    await waitForSyncStatus({ page, status: "idle" });

    await measure("content mode insert deletable template", async () => {
      await insertTemplateAfterCanvasText({
        page,
        anchorText: "Initial content",
        templateName: fixture.deletableTemplateName,
      });
    });
    await waitForCanvasText({
      page,
      text: fixture.deletableTemplateText,
    });

    await measure("content mode delete direct child", async () => {
      await deleteContentBlockChildAfterCanvasText({
        page,
        text: fixture.deletableTemplateText,
      });
    });
    await waitForCanvasTextHidden({
      page,
      text: fixture.deletableTemplateText,
    });

    await measure(
      "content mode reload editor for direct child delete",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await waitForCanvasTextHidden({
      page,
      text: fixture.deletableTemplateText,
    });
    await waitForSyncStatus({ page, status: "idle" });

    await measure("content mode insert nested template", async () => {
      await insertTemplateAfterCanvasText({
        page,
        anchorText: "Initial content",
        templateName: fixture.nestedTemplateName,
      });
    });
    await waitForCanvasText({
      page,
      text: fixture.nestedTemplateText,
    });
    await waitForSyncStatus({ page, status: "idle" });

    await measure("content mode try nested delete", async () => {
      const canvas = await waitForCanvasFrame({ page });
      await page.keyboard.down("Alt");
      try {
        await canvas.getByText(fixture.nestedTemplateText).hover();
        await page
          .getByRole("button", { name: "Delete block" })
          .waitFor({ state: "hidden", timeout: 1_000 });
      } finally {
        await page.keyboard.up("Alt");
      }
    });
    await waitForCanvasText({
      page,
      text: fixture.nestedTemplateText,
    });
    await waitForSyncStatus({ page, status: "idle" });

    await openPagesPanel({ page });
    await expectContentModeTemplateActionsUnavailable({
      page,
      templateName: fixture.pageTemplateName,
    });

    await page.getByRole("tab", { name: "Navigator" }).click();
    await expectTextHidden({ page, text: "Global Root" });
    await expectTextHidden({ page, text: fixture.pageTemplateName });
    await waitForSyncStatus({ page, status: "idle" });
  } finally {
    await close();
  }
});
test("Editor can edit text and content props but not design props", async () => {
  const fixture = getSharedContentModeProject();
  const editedHref = "/edited-link";
  const editedImageSrc =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23dff7e8'/%3E%3C/svg%3E";
  const editedImageAlt = "Edited image alt";
  const editedVideoSrc = "https://example.com/edited-video.mp4";
  const editedContent = "Edited isolated content";
  const { page, close } = await newIsolatedPage();

  try {
    await measure("content mode open editor for props", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.editorToken,
        mode: "content",
      });
    });
    await waitForCanvasText({ page, text: "Initial link" });
    await waitForSyncStatus({ page, status: "idle" });

    await insertTemplateAfterCanvasText({
      page,
      anchorText: "Initial content",
      templateName: fixture.editableTextTemplateName,
    });
    await waitForCanvasText({
      page,
      text: fixture.editableTextTemplateText,
    });

    await insertTemplateAfterCanvasText({
      page,
      anchorText: "Initial content",
      templateName: fixture.contentPropsTemplateName,
    });
    await waitForCanvasText({
      page,
      text: fixture.contentPropsTemplateLinkText,
    });
    await waitForCanvasImage({
      page,
      alt: fixture.contentPropsTemplateImageAlt,
    });
    await waitForCanvasVideoSource({
      page,
      sourceName: fixture.contentPropsTemplateVideoName,
    });

    await measure("content mode edit text and save", async () => {
      await replaceCanvasText({
        page,
        currentText: fixture.editableTextTemplateText,
        text: editedContent,
      });
    });

    await selectCanvasTextInstanceForProps({
      page,
      text: "Initial link",
      propertyLabel: "Href",
    });
    await expectLocatorHidden({
      locator: page.getByRole("tab", { name: "Style" }),
      message: "Expected Style tab to be unavailable in content mode",
    });
    await expectTextHidden({ page, text: "Style sources" });
    await expectTextHidden({ page, text: "Target" });

    await selectCanvasTextInstanceForProps({
      page,
      text: fixture.contentPropsTemplateLinkText,
      propertyLabel: "Href",
    });
    await fillSelectedStringProperty({
      page,
      label: "Href",
      control: "url",
      value: editedHref,
    });

    await selectCanvasImage({
      page,
      alt: fixture.contentPropsTemplateImageAlt,
    });
    await fillSelectedStringProperty({
      page,
      label: "Source",
      control: "url",
      value: editedImageSrc,
    });
    await fillSelectedStringProperty({
      page,
      label: "Alt",
      control: "text",
      value: editedImageAlt,
    });

    await selectCanvasVideoSource({
      page,
      sourceName: fixture.contentPropsTemplateVideoName,
    });
    await fillSelectedStringProperty({
      page,
      label: "Source",
      control: "url",
      value: editedVideoSrc,
    });

    await measure("content mode reload editor for props", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.editorToken,
        mode: "content",
      });
    });
    await waitForCanvasText({
      page,
      text: fixture.contentPropsTemplateLinkText,
    });
    await waitForCanvasText({ page, text: editedContent });
    await waitForSyncStatus({ page, status: "idle" });

    await selectCanvasTextInstanceForProps({
      page,
      text: fixture.contentPropsTemplateLinkText,
      propertyLabel: "Href",
    });
    await waitForSelectedStringPropertyValue({
      page,
      label: "Href",
      control: "url",
      value: editedHref,
    });

    await selectCanvasImage({
      page,
      alt: editedImageAlt,
    });
    await waitForSelectedStringPropertyValue({
      page,
      label: "Source",
      control: "url",
      value: editedImageSrc,
    });
    await waitForSelectedStringPropertyValue({
      page,
      label: "Alt",
      control: "text",
      value: editedImageAlt,
    });

    await selectCanvasVideoSource({
      page,
      sourceName: "edited-video.mp4",
    });
    await waitForSelectedStringPropertyValue({
      page,
      label: "Source",
      control: "url",
      value: editedVideoSrc,
    });
    await waitForCanvasText({ page, text: editedContent });
  } finally {
    await close();
  }
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
