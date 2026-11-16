import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
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
import { openProjectBuilder, waitForCanvasFrame } from "../flows/builder";
import {
  selectCanvasImage,
  waitForCanvasImage,
  waitForCanvasImageSourceName,
} from "../flows/canvas-media";
import { chooseSelectedAssetProperty } from "../flows/props-panel";
import {
  waitForChangeToBeSaved,
  waitForSyncComplete,
} from "../flows/sync-status";
import { insertTemplateAfterCanvasText } from "../flows/template-insertion";
import { measure } from "../perf";
import { e2ePaidPlanName } from "../plans";
import { test } from "../test";

test("Editor can save assets, folders, and collection entries in content mode", async ({
  context,
  page,
}) => {
  const fixture = await createContentModeProject({
    context,
    devPlan: e2ePaidPlanName,
    email: `content-mode-assets-${randomUUID()}@webstudio.test`,
  });
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
  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });
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
