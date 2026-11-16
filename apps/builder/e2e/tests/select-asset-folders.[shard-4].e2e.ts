import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { insertAssetFolders } from "../db";
import { openAssetsPanel, uploadAssets } from "../flows/assets-panel";
import { openProjectBuilder } from "../flows/builder";
import {
  waitForChangeToBeSaved,
  waitForSyncStatus,
} from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { test } from "../test";

const selectAndDragAssets = async (page: Page) => {
  const [firstAssetTitle, secondAssetTitle] = await uploadAssets({
    page,
    filenames: ["upload-image.svg", "replacement-image.svg"],
  });
  const firstAsset = page.getByTitle(firstAssetTitle);
  const secondAsset = page.getByTitle(secondAssetTitle);
  await firstAsset.scrollIntoViewIfNeeded();
  await secondAsset.scrollIntoViewIfNeeded();
  const firstBounds = await firstAsset.boundingBox();
  const secondBounds = await secondAsset.boundingBox();
  const viewport = firstAsset.locator(
    "xpath=ancestor::*[@data-asset-manager-scroll-area]"
  );
  const viewportBounds = await viewport.boundingBox();
  if (
    firstBounds === null ||
    secondBounds === null ||
    viewportBounds === null
  ) {
    throw new Error("Expected visible assets and asset-list viewport");
  }

  const start = {
    x: viewportBounds.x + viewportBounds.width - 2,
    y: viewportBounds.y + viewportBounds.height - 2,
  };
  const end = {
    x: Math.min(firstBounds.x, secondBounds.x) - 2,
    y: Math.min(firstBounds.y, secondBounds.y) - 2,
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  try {
    await page.mouse.move(end.x, end.y, { steps: 10 });
    await page.locator("[data-asset-manager-marquee]").waitFor();
  } finally {
    await page.mouse.up();
  }

  for (const asset of [firstAsset, secondAsset]) {
    const option = asset.locator("xpath=ancestor::*[@role='option']");
    if ((await option.getAttribute("aria-selected")) !== "true") {
      throw new Error(
        "Expected dragging across the panel to select both assets"
      );
    }
  }
  await page.keyboard.press("Escape");
  const scrollArea = page.locator("[data-asset-manager-scroll-area]");
  const destination = page.getByRole("button", {
    name: "Folder Destination",
    exact: true,
  });
  const asset = firstAsset;
  await asset.scrollIntoViewIfNeeded();
  if ((await scrollArea.evaluate((element) => element.scrollTop)) === 0) {
    throw new Error("Expected the long asset list to be scrolled");
  }

  const assetBounds = await asset.boundingBox();
  const scrollBounds = await scrollArea.boundingBox();
  if (assetBounds === null || scrollBounds === null) {
    throw new Error("Expected visible asset and native scroll area");
  }
  const from = {
    x: assetBounds.x + assetBounds.width / 2,
    y: assetBounds.y + assetBounds.height / 2,
  };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  try {
    await page.mouse.move(from.x + 8, from.y + 8, { steps: 4 });
    const deadline = Date.now() + 10_000;
    let destinationBounds = await destination.boundingBox();
    while (
      Date.now() < deadline &&
      (destinationBounds === null ||
        destinationBounds.y < scrollBounds.y ||
        destinationBounds.y + destinationBounds.height >
          scrollBounds.y + scrollBounds.height)
    ) {
      await page.mouse.move(
        scrollBounds.x + scrollBounds.width / 2,
        scrollBounds.y + 4,
        { steps: 2 }
      );
      await page.waitForTimeout(120);
      destinationBounds = await destination.boundingBox();
    }
    if (
      destinationBounds === null ||
      destinationBounds.y < scrollBounds.y ||
      destinationBounds.y + destinationBounds.height >
        scrollBounds.y + scrollBounds.height
    ) {
      throw new Error("Expected auto-scroll to reveal the destination folder");
    }
    await page.mouse.move(
      destinationBounds.x + destinationBounds.width / 2,
      destinationBounds.y + destinationBounds.height / 2,
      { steps: 4 }
    );
    const dropDeadline = Date.now() + 5_000;
    while (
      Date.now() < dropDeadline &&
      (await destination.getAttribute("data-is-drop-over")) !== "true"
    ) {
      await page.mouse.move(
        destinationBounds.x + destinationBounds.width / 2 + 1,
        destinationBounds.y + destinationBounds.height / 2,
        { steps: 2 }
      );
      await page.waitForTimeout(100);
    }
    if ((await destination.getAttribute("data-is-drop-over")) !== "true") {
      throw new Error("Expected the destination folder to accept the drop");
    }
    const save = waitForChangeToBeSaved({ page, timeout: 30_000 });
    await page.mouse.up();
    await save;
  } catch (error) {
    await page.mouse.up();
    throw error;
  }

  await asset.waitFor({ state: "hidden" });
  await destination.dblclick();
  await firstAsset.waitFor();
};

const deleteSelectedFolders = async (page: Page, folderNames: string[]) => {
  const folders = folderNames.map((name) =>
    page.getByRole("button", { name: `Folder ${name}`, exact: true })
  );

  await folders[1]!.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Settings" }).waitFor();
  await page.keyboard.press("Escape");

  await folders[0]!.click();
  await folders[2]!.click({ modifiers: ["Shift"] });
  const options = page.getByRole("option");
  for (const folder of folders) {
    const option = options.filter({ has: folder });
    if ((await option.getAttribute("aria-selected")) !== "true") {
      throw new Error("Expected Shift + Click to select the folder range");
    }
  }

  await page.keyboard.press("Escape");
  await folders[0]!.click();
  await folders[2]!.click({
    modifiers: [process.platform === "darwin" ? "Meta" : "Control"],
  });
  const selectedOptions = page.locator('[role="option"][aria-selected="true"]');
  if ((await selectedOptions.count()) !== 2) {
    throw new Error("Expected Cmd/Ctrl + Click to select two folders");
  }

  await folders[0]!.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const deleteDialog = page
    .getByRole("dialog")
    .filter({ hasText: "Delete selected items" });
  await deleteDialog.waitFor();
  await Promise.all([
    waitForChangeToBeSaved({ page }),
    deleteDialog.getByRole("button", { name: "Delete" }).click(),
  ]);

  await folders[0]!.waitFor({ state: "hidden" });
  await folders[2]!.waitFor({ state: "hidden" });
  await folders[1]!.waitFor({ state: "visible" });
};

test("Assets can be selected and dragged and folders can be multiselected and deleted", async ({
  page,
  context,
}) => {
  const { projectId, builderToken } = await createContentModeProject({
    context,
    page,
    email: "asset-folder-autoscroll-e2e@webstudio.test",
    title: "Asset Folder Autoscroll E2E",
    builderToken: "asset-folder-autoscroll-e2e-builder-token",
  });

  // The long list is a precondition for the drag, so seed its filler folders together.
  const createdAt = new Date().toISOString();
  const folderNames = ["Alpha", "Bravo", "Charlie"];
  const fillers = Array.from(
    { length: 24 },
    (_, index) => `Filler ${String(index).padStart(2, "0")}`
  );
  await insertAssetFolders(
    [...folderNames, "Destination", ...fillers].map((name) => ({
      id: randomUUID(),
      projectId,
      name,
      parentId: null,
      createdAt,
    }))
  );

  await openProjectBuilder({
    page,
    projectId,
    authToken: builderToken,
  });
  await waitForSyncStatus({ page, status: "idle" });
  await openAssetsPanel({ page });
  await test.step("Asset selection and drag work across a long folder list", async () => {
    await selectAndDragAssets(page);
  });

  await test.step("Folders can be multiselected and deleted as one operation", async () => {
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await deleteSelectedFolders(page, folderNames);
  });

  await openProjectBuilder({
    page,
    projectId,
    authToken: builderToken,
  });
  await openAssetsPanel({ page });
  await page
    .getByRole("button", { name: "Folder Bravo", exact: true })
    .waitFor();
  for (const deletedName of ["Alpha", "Charlie"]) {
    if (
      await page
        .getByRole("button", { name: `Folder ${deletedName}`, exact: true })
        .isVisible()
    ) {
      throw new Error(`Expected ${deletedName} to stay deleted after reload`);
    }
  }
});
