import {
  createAssetFolder,
  openAssetsPanel,
  uploadAsset,
} from "../flows/assets-panel";
import { openProjectBuilder } from "../flows/builder";
import { dragPointer } from "../flows/drag";
import {
  waitForChangeToBeSaved,
  waitForSyncStatus,
} from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { newIsolatedPage, test } from "../harness";

test("Assets can be selected by dragging across the panel", async () => {
  const fixture = await createContentModeProject({
    email: "asset-folder-lasso-select-e2e@webstudio.test",
    title: "Asset Folder Lasso Select E2E",
    builderToken: "asset-folder-lasso-select-e2e-builder-token",
  });
  const { page, close } = await newIsolatedPage();

  try {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await waitForSyncStatus({ page, status: "idle" });
    await openAssetsPanel({ page });
    const firstAssetTitle = await uploadAsset({
      page,
      filename: "upload-image.svg",
    });
    const secondAssetTitle = await uploadAsset({
      page,
      filename: "replacement-image.svg",
    });
    const firstAsset = page.getByTitle(firstAssetTitle);
    const secondAsset = page.getByTitle(secondAssetTitle);
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
  } finally {
    await close();
  }
});

test("Multiselected folders can be dragged into a folder", async () => {
  const fixture = await createContentModeProject({
    email: "asset-folder-multifolder-drag-e2e@webstudio.test",
    title: "Asset Folder Multifolder Drag E2E",
    builderToken: "asset-folder-multifolder-drag-e2e-builder-token",
  });
  const { page, close } = await newIsolatedPage();

  try {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await waitForSyncStatus({ page, status: "idle" });
    await openAssetsPanel({ page });
    const destination = await createAssetFolder({
      page,
      name: "Destination",
    });
    const alpha = await createAssetFolder({ page, name: "Alpha" });
    const bravo = await createAssetFolder({ page, name: "Bravo" });

    await alpha.click();
    await bravo.click({
      modifiers: [process.platform === "darwin" ? "Meta" : "Control"],
    });
    if (
      (await page.locator('[role="option"][aria-selected="true"]').count()) !==
      2
    ) {
      throw new Error("Expected both folders to be selected before dragging");
    }

    await Promise.all([
      waitForChangeToBeSaved({ page, timeout: 30_000 }),
      dragPointer({
        page,
        source: bravo,
        target: destination,
        ready: async () =>
          (await destination.getAttribute("data-is-drop-over")) === "true",
      }),
    ]);
    await alpha.waitFor({ state: "hidden" });
    await bravo.waitFor({ state: "hidden" });
    await destination.dblclick();
    await page
      .getByRole("button", { name: "Folder Alpha", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Folder Bravo", exact: true })
      .waitFor();
  } finally {
    await close();
  }
});

test("Dragging an asset auto-scrolls a long folder list", async () => {
  const fixture = await createContentModeProject({
    email: "asset-folder-autoscroll-e2e@webstudio.test",
    title: "Asset Folder Autoscroll E2E",
    builderToken: "asset-folder-autoscroll-e2e-builder-token",
  });
  const { page, close } = await newIsolatedPage();

  try {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await waitForSyncStatus({ page, status: "idle" });
    await openAssetsPanel({ page });
    const assetTitle = await uploadAsset({
      page,
      filename: "upload-image.svg",
    });
    const scrollArea = page.locator("[data-asset-manager-scroll-area]");
    for (let index = 0; index < 24; index += 1) {
      await createAssetFolder({
        page,
        name: `Filler ${String(index).padStart(2, "0")}`,
      });
      const overflows = await scrollArea.evaluate(
        (element) => element.scrollHeight > element.clientHeight + 80
      );
      if (overflows) {
        break;
      }
    }
    const destination = await createAssetFolder({
      page,
      name: "Destination",
    });
    const asset = page.getByTitle(assetTitle);
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
        throw new Error(
          "Expected auto-scroll to reveal the destination folder"
        );
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
    await page.getByTitle(assetTitle).waitFor();
  } finally {
    await close();
  }
});

test("Multiselected assets can be moved from the context menu", async () => {
  const fixture = await createContentModeProject({
    email: "asset-folder-menu-move-e2e@webstudio.test",
    title: "Asset Folder Menu Move E2E",
    builderToken: "asset-folder-menu-move-e2e-builder-token",
  });
  const { page, close } = await newIsolatedPage();

  try {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await waitForSyncStatus({ page, status: "idle" });
    await openAssetsPanel({ page });
    const destination = await createAssetFolder({
      page,
      name: "Destination",
    });
    const firstAssetTitle = await uploadAsset({
      page,
      filename: "upload-image.svg",
    });
    const secondAssetTitle = await uploadAsset({
      page,
      filename: "replacement-image.svg",
    });
    const firstAsset = page.getByTitle(firstAssetTitle);
    const secondAsset = page.getByTitle(secondAssetTitle);

    await firstAsset.click();
    await secondAsset.click({
      modifiers: [process.platform === "darwin" ? "Meta" : "Control"],
    });
    await secondAsset.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Move", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Move items" });
    await dialog.getByRole("combobox", { name: "Folder" }).click();
    await page
      .getByRole("option", { name: "Destination", exact: true })
      .click();
    await Promise.all([
      waitForChangeToBeSaved({ page, timeout: 30_000 }),
      dialog.getByRole("button", { name: "Move", exact: true }).click(),
    ]);

    await firstAsset.waitFor({ state: "hidden" });
    await secondAsset.waitFor({ state: "hidden" });
    await destination.dblclick();
    await page.getByTitle(firstAssetTitle).waitFor();
    await page.getByTitle(secondAssetTitle).waitFor();
  } finally {
    await close();
  }
});

test("Folders can be multiselected and deleted as one operation", async () => {
  const fixture = await createContentModeProject({
    email: "asset-folder-multiselect-e2e@webstudio.test",
    title: "Asset Folder Multiselect E2E",
    builderToken: "asset-folder-multiselect-e2e-builder-token",
  });
  const { page, close } = await newIsolatedPage();
  const folderNames = ["Alpha", "Bravo", "Charlie"];

  try {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await waitForSyncStatus({ page, status: "idle" });
    await openAssetsPanel({ page });
    const folders = [];
    for (const name of folderNames) {
      folders.push(await createAssetFolder({ page, name }));
    }

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
    const selectedOptions = page.locator(
      '[role="option"][aria-selected="true"]'
    );
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

    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
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
  } finally {
    await close();
  }
});
