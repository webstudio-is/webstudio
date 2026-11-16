import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { loadDevBuild } from "../db";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  createAssetFolder,
  deleteSelectedAsset,
  openAssetSettings,
  openAssetsPanel,
  replaceSelectedAsset,
  uploadAsset,
  waitForAsset,
} from "../flows/assets-panel";
import {
  openProjectBuilder,
  waitForCanvasFrame,
  waitForCanvasText,
} from "../flows/builder";
import {
  selectCanvasImage,
  waitForCanvasImage,
  waitForCanvasImageCount,
  waitForCanvasImageSourceName,
  waitForCanvasVideoSource,
} from "../flows/canvas-media";
import {
  waitForCanvasTextStyle,
  waitForCanvasTextStyleCount,
} from "../flows/canvas-style";
import { chooseSelectedAssetProperty } from "../flows/props-panel";
import {
  waitForChangeToBeSaved,
  waitForSyncComplete,
} from "../flows/sync-status";
import { insertTemplateAfterCanvasText } from "../flows/template-insertion";
import { measure } from "../perf";
import { e2ePaidPlanName } from "../plans";
import { test } from "../test";

test("Content templates, assets, and collection entries persist across Builder modes", async ({
  context,
  page,
}) => {
  const fixture = await createContentModeProject({
    context,
    page,
    devPlan: e2ePaidPlanName,
    email: `content-mode-assets-${randomUUID()}@webstudio.test`,
  });
  const getImageAssetReferenceCount = async () => {
    const build = await loadDevBuild({ projectId: fixture.projectId });
    const props = JSON.parse(build.props) as Array<{
      name: string;
      type: string;
      value: string;
    }>;
    const references = props.filter(
      (prop) =>
        prop.name === "src" &&
        prop.type === "asset" &&
        prop.value === fixture.assetTemplateImageAssetId
    );
    return references.length;
  };

  const uploadFilename = "large-image.svg";
  const replacementFilename = "replacement-image.svg";
  const collectionName = "Content collection entries";
  const folderName = "Editor ordinary assets";
  const entryTitle = "Content collection entry";
  const entryFilename = "content-collection-entry.mdx";
  const assetsPanel = page.getByRole("tabpanel", { name: "Assets" });
  const browseRoot = () =>
    assetsPanel.getByRole("button", { name: "Root", exact: true }).click();

  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  await waitForSyncComplete({ page });
  await openAssetsPanel({ page });
  const collection = await createAssetFolder({
    page,
    name: collectionName,
    useAsContentCollection: true,
  });
  await collection.dblclick();
  await page.getByRole("button", { name: "Collection settings" }).waitFor();

  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });
  await waitForSyncComplete({ page });
  await openAssetsPanel({ page });
  // The last folder is remembered for this project, including across modes.
  await page.getByTitle("collection.json").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Add asset" }).click();
  await page.getByRole("menuitem", { name: "New entry" }).click();
  const dialog = page.getByRole("dialog", { name: "New entry" });
  await dialog.getByLabel("Title *").fill(entryTitle);
  await Promise.all([
    waitForChangeToBeSaved({ page }),
    dialog.getByRole("button", { name: "Create entry" }).click(),
  ]);
  await waitForAsset({ page, filename: entryFilename });
  await page.getByTitle("collection.json").waitFor({ state: "visible" });
  await page.getByTitle("template.mdx").waitFor({ state: "visible" });

  await browseRoot();
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
  await waitForCanvasImageSourceName({ page, sourceName: "large-image_" });
  const canvas = await waitForCanvasFrame({ page });
  const uploadedImage = canvas.locator('img[src*="large-image_"]');
  await expect(uploadedImage).toHaveAttribute("width", "240");
  await expect(uploadedImage).toHaveAttribute("height", "160");

  let replacementAssetTitle = "";
  await measure("content mode replace used image source asset", async () => {
    await openAssetsPanel({ page });
    await openAssetSettings({
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
  await waitForSyncComplete({ page });

  const folder = await createAssetFolder({ page, name: folderName });
  await folder.dblclick();

  const deletedAsset =
    await test.step("Upload, replace and delete an unused asset in the ordinary folder", async () => {
      const uploadFilename = "upload-image.svg";
      const replacementFilename = "large-image.svg";
      let uploadedAssetTitle = "";
      await measure("content mode upload asset", async () => {
        uploadedAssetTitle = await uploadAsset({
          page,
          filename: uploadFilename,
        });
      });

      let replacementAssetTitle = "";
      await measure("content mode replace asset", async () => {
        await openAssetSettings({ page, filename: uploadedAssetTitle });
        const assetId = await page.locator("#asset-manager-id").inputValue();
        if (assetId.length === 0) {
          throw new Error(
            "Expected Asset settings to expose the uploaded asset id"
          );
        }
        await page.getByText("0 uses", { exact: true }).waitFor();
        replacementAssetTitle = await replaceSelectedAsset({
          page,
          filename: replacementFilename,
        });
      });

      await measure("content mode delete asset", async () => {
        await openAssetSettings({ page, filename: replacementAssetTitle });
        await deleteSelectedAsset({
          page,
          filename: replacementAssetTitle,
        });
      });

      return { uploadedAssetTitle, replacementAssetTitle };
    });

  await browseRoot();
  await collection.dblclick();

  const initialAssetReferenceCount = await getImageAssetReferenceCount();
  await test.step("Editor can insert templates with styles and assets", async () => {
    await waitForCanvasText({ page, text: "Initial content" });
    // Check each insertion on the canvas, then wait for the final save before
    // opening the project as Builder and checking persistence across reloads.
    await measure("content mode insert asset template", async () => {
      await insertTemplateAfterCanvasText({
        page,
        anchorText: "Initial content",
        templateName: fixture.assetTemplateName,
        waitForProjectSync: false,
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
        waitForProjectSync: false,
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
        waitForProjectSync: false,
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
        waitForProjectSync: false,
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
  });

  await test.step("Builder can copy and paste the inserted image and save its asset references", async () => {
    await measure("asset copy open build mode", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasImage({
      page,
      alt: fixture.assetTemplateImageAlt,
    });
    await selectCanvasImage({
      page,
      alt: fixture.assetTemplateImageAlt,
    });
    await page.keyboard.press("ControlOrMeta+C");
    const save = waitForChangeToBeSaved({ page });
    await page.keyboard.press("ControlOrMeta+V");
    await save;
    await waitForSyncComplete({ page });
    await waitForCanvasImageCount({
      page,
      alt: fixture.assetTemplateImageAlt,
      count: 2,
    });
    if (
      (await getImageAssetReferenceCount()) !==
      initialAssetReferenceCount + 2
    ) {
      throw new Error(
        "Expected insertion and paste to add two asset references."
      );
    }
  });

  await test.step("Reload content mode and check copied templates, assets, folders, and entries", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
      mode: "content",
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
    await waitForSyncComplete({ page });
    await waitForCanvasImageCount({
      page,
      alt: fixture.assetTemplateImageAlt,
      count: 2,
    });
    if (
      (await getImageAssetReferenceCount()) !==
      initialAssetReferenceCount + 2
    ) {
      throw new Error("Expected reload to preserve copied asset references.");
    }

    await openAssetsPanel({ page });
    await waitForAsset({ page, filename: entryFilename });
    await page.getByTitle("collection.json").waitFor({ state: "visible" });
    await page.getByTitle("template.mdx").waitFor({ state: "visible" });
    await browseRoot();
    const expectDeletedAssetAbsent = async () => {
      await expect(
        assetsPanel.getByTitle(deletedAsset.uploadedAssetTitle)
      ).toHaveCount(0);
      await expect(
        assetsPanel.getByTitle(deletedAsset.replacementAssetTitle)
      ).toHaveCount(0);
    };
    await expectDeletedAssetAbsent();
    await waitForCanvasImageSourceName({
      page,
      sourceName: "replacement-image_",
    });
    await page.getByTitle(replacementAssetTitle).waitFor();
    await waitForSyncComplete({ page });
    const reloadedCanvas = await waitForCanvasFrame({ page });
    const replacementImage = reloadedCanvas.locator(
      'img[src*="replacement-image_"]'
    );
    await expect(replacementImage).toHaveAttribute("width", "120");
    await expect(replacementImage).toHaveAttribute("height", "80");
    await folder.dblclick();
    await expectDeletedAssetAbsent();
  });
});
