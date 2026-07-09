import {
  deleteSelectedAsset,
  openAssetDetails,
  openAssetsPanel,
  replaceSelectedAsset,
  uploadAsset,
} from "../flows/assets-panel";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import {
  selectCanvasImage,
  waitForCanvasImage,
  waitForCanvasImageSourceName,
  waitForCanvasVideoSource,
} from "../flows/canvas-media";
import {
  waitForCanvasTextStyle,
  waitForCanvasTextStyleCount,
} from "../flows/canvas-style";
import { chooseSelectedAssetProperty } from "../flows/props-panel";
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
        templateName: fixture.tokenTemplateLabel,
      });
    });
    await waitForCanvasText({
      page,
      text: fixture.tokenTemplateVisibleText,
    });
    await waitForCanvasTextStyle({
      page,
      text: fixture.tokenTemplateVisibleText,
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
      text: fixture.tokenTemplateVisibleText,
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
    await waitForSyncStatus({ page, status: "idle" });

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
