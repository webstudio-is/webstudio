import {
  createAssetFolder,
  dragAssetToFolder,
  openAssetsPanel,
  openAssetSettings,
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

test("Asset can be dragged into a folder", async () => {
  const fixture = await createContentModeProject({
    email: "asset-folder-drag-e2e@webstudio.test",
    title: "Asset Folder Drag E2E",
    builderToken: "asset-folder-drag-e2e-builder-token",
  });
  const { page, close } = await newIsolatedPage();
  const filename = "upload-image.svg";
  const folderName = "Images";

  try {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await waitForSyncStatus({ page, status: "idle" });
    await openAssetsPanel({ page });
    const assetTitle = await uploadAsset({ page, filename });
    const folder = await createAssetFolder({ page, name: folderName });

    await dragAssetToFolder({ page, assetTitle, folderName });
    await folder.dblclick();
    await page.getByTitle(assetTitle).waitFor();

    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await openAssetsPanel({ page });
    await page
      .getByRole("button", { name: `Folder ${folderName}`, exact: true })
      .dblclick();
    await page.getByTitle(assetTitle).waitFor();
    await waitForSyncStatus({ page, status: "idle" });
  } finally {
    await close();
  }
});

test("Dragging over Back navigates to parent folders before dropping", async () => {
  const fixture = await createContentModeProject({
    email: "asset-folder-back-drag-e2e@webstudio.test",
    title: "Asset Folder Back Drag E2E",
    builderToken: "asset-folder-back-drag-e2e-builder-token",
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

    const parent = await createAssetFolder({ page, name: "Parent" });
    await parent.dblclick();
    const child = await createAssetFolder({ page, name: "Child" });
    await child.dblclick();
    const grandchild = await createAssetFolder({ page, name: "Grandchild" });
    await grandchild.dblclick();
    const assetTitle = await uploadAsset({
      page,
      filename: "upload-image.svg",
    });
    const asset = page.getByTitle(assetTitle);
    const assetBounds = await asset.boundingBox();
    if (assetBounds === null) {
      throw new Error("Expected visible asset drag source");
    }

    const from = {
      x: assetBounds.x + assetBounds.width / 2,
      y: assetBounds.y + assetBounds.height / 2,
    };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    try {
      await page.mouse.move(from.x + 8, from.y + 8, { steps: 4 });

      for (const folderName of ["Grandchild", "Child"]) {
        const back = page.getByRole("button", { name: "Back", exact: true });
        const backBounds = await back.boundingBox();
        if (backBounds === null) {
          throw new Error("Expected visible Back drag target");
        }
        await page.mouse.move(
          backBounds.x - 4,
          backBounds.y + backBounds.height / 2
        );
        await page.mouse.move(
          backBounds.x + backBounds.width / 2,
          backBounds.y + backBounds.height / 2,
          { steps: 4 }
        );
        await page
          .getByRole("button", {
            name: `Folder ${folderName}`,
            exact: true,
          })
          .waitFor({ timeout: 5_000 });
      }

      const assetGrid = page.getByRole("listbox");
      const gridBounds = await assetGrid.boundingBox();
      if (gridBounds === null) {
        throw new Error("Expected visible asset grid drop target");
      }
      await page.mouse.move(
        gridBounds.x + gridBounds.width - 4,
        gridBounds.y + gridBounds.height - 4,
        { steps: 4 }
      );
      const save = waitForChangeToBeSaved({ page, timeout: 30_000 });
      await page.mouse.up();
      await save;
    } catch (error) {
      await page.mouse.up();
      throw error;
    }

    await page.getByTitle(assetTitle).waitFor();
    await page
      .getByRole("button", { name: "Folder Child", exact: true })
      .waitFor();
  } finally {
    await close();
  }
});

test("Asset folder changes wait until the nested selector loses focus", async () => {
  const fixture = await createContentModeProject({
    email: "asset-folder-selector-e2e@webstudio.test",
    title: "Asset Folder Selector E2E",
    builderToken: "asset-folder-selector-e2e-builder-token",
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

    const parent = await createAssetFolder({ page, name: "Parent" });
    await parent.dblclick();
    await createAssetFolder({ page, name: "Child" });
    await page.getByRole("button", { name: "Back", exact: true }).click();

    const assetTitle = await uploadAsset({
      page,
      filename: "upload-image.svg",
    });
    await openAssetSettings({ page, filename: assetTitle });

    const settings = page.getByText("Asset settings");
    const topLevelSelect = page.getByRole("combobox", {
      name: "Folder",
      exact: true,
    });
    await topLevelSelect.click();
    await page.getByRole("option", { name: "Parent", exact: true }).click();
    await settings.waitFor();

    const childSelect = page.getByRole("combobox", {
      name: "Asset subfolder level 1",
      exact: true,
    });
    await childSelect.click();
    await page.getByRole("option", { name: "Child", exact: true }).click();
    await settings.waitFor();

    await Promise.all([
      waitForChangeToBeSaved({ page, timeout: 30_000 }),
      page.locator("#asset-manager-filename").click(),
    ]);
    await settings.waitFor({ state: "hidden" });

    await parent.dblclick();
    await page
      .getByRole("button", { name: "Folder Child", exact: true })
      .dblclick();
    await page.getByTitle(assetTitle).waitFor();
  } finally {
    await close();
  }
});

test("Multiselected assets can be dragged into a folder", async () => {
  const fixture = await createContentModeProject({
    email: "asset-folder-multidrag-e2e@webstudio.test",
    title: "Asset Folder Multidrag E2E",
    builderToken: "asset-folder-multidrag-e2e-builder-token",
  });
  const { page, close } = await newIsolatedPage();
  const folderName = "Selected assets";

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
    const folder = await createAssetFolder({ page, name: folderName });
    const firstAsset = page.getByTitle(firstAssetTitle);
    const secondAsset = page.getByTitle(secondAssetTitle);

    await firstAsset.click();
    await secondAsset.click({
      modifiers: [process.platform === "darwin" ? "Meta" : "Control"],
    });
    if (
      (await page.locator('[role="option"][aria-selected="true"]').count()) !==
      2
    ) {
      throw new Error("Expected both assets to be selected before dragging");
    }

    await dragAssetToFolder({
      page,
      assetTitle: secondAssetTitle,
      folderName,
    });
    await firstAsset.waitFor({ state: "hidden" });
    await folder.dblclick();
    await page.getByTitle(firstAssetTitle).waitFor();
    await page.getByTitle(secondAssetTitle).waitFor();
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
