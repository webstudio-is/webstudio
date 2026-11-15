import { randomUUID } from "node:crypto";
import {
  createAssetFolder,
  dragAssetToFolder,
  openAssetsPanel,
  uploadAsset,
} from "../flows/assets-panel";
import { openProjectBuilder } from "../flows/builder";
import {
  waitForChangeToBeSaved,
  waitForSyncStatus,
} from "../flows/sync-status";
import { insertAssetFolders, insertAuthorizationToken } from "../db";
import { createProjectThroughApi } from "../fixtures/create-project";
import { dashboardUrl, test } from "../test";

test("Asset folder moves survive Builder reload and project cloning", async ({
  page,
  context,
}) => {
  const cloneTitle = "Asset Folder Clone Result";
  const projectId = await createProjectThroughApi({
    context,
    email: "asset-folder-clone-e2e@webstudio.test",
    title: "Asset Folder Clone Source",
  });
  const builderToken = randomUUID();
  const parentId = randomUUID();
  const childId = randomUUID();
  const createdAt = new Date().toISOString();
  // This hierarchy is the starting point for the drag and clone checks.
  await Promise.all([
    insertAuthorizationToken({
      token: builderToken,
      projectId,
      name: "E2E asset folder builder",
      relation: "builders",
    }),
    insertAssetFolders(
      [
        { id: parentId, name: "Parent", parentId: null },
        { id: childId, name: "Child", parentId },
      ].map((folder) => ({ ...folder, projectId, createdAt }))
    ),
  ]);
  const openSource = () =>
    openProjectBuilder({ page, projectId, authToken: builderToken });

  await openSource();
  await waitForSyncStatus({ page, status: "idle" });
  await openAssetsPanel({ page });

  const child = page.getByRole("button", { name: "Folder Child", exact: true });
  await page
    .getByRole("button", { name: "Folder Parent", exact: true })
    .dblclick();
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

  await asset.waitFor();
  await child.waitFor();
  await dragAssetToFolder({ page, assetTitle, folderName: "Child" });
  await child.dblclick();
  await asset.waitFor();

  await openSource();
  await openAssetsPanel({ page });
  // Reopening Assets restores Child rather than returning to the root.
  await page.getByRole("button", { name: "Back", exact: true }).waitFor();
  await asset.waitFor();
  await waitForSyncStatus({ page, status: "idle" });

  const cloneUrl = new URL("/dashboard", dashboardUrl);
  cloneUrl.searchParams.set("projectToCloneAuthToken", builderToken);
  await page.goto(cloneUrl.href);
  const cloneDialog = page.getByRole("dialog", { name: "Clone project" });
  await cloneDialog.locator('input[name="title"]').fill(cloneTitle);
  await cloneDialog.getByRole("button", { name: "Clone", exact: true }).click();

  const clonedProjectTitle = page.getByText(cloneTitle, { exact: true });
  await clonedProjectTitle.waitFor();
  const clonedProjectCard = clonedProjectTitle.locator(
    "xpath=ancestor::div[.//a][1]"
  );
  await clonedProjectCard.locator("a").first().click();
  await page.waitForURL(/https:\/\/p-[^.]+\.wstd\.dev:\d+\//);
  await openAssetsPanel({ page, force: true });
  await page
    .getByRole("button", { name: "Folder Parent", exact: true })
    .press("Enter");
  await page
    .getByRole("button", { name: "Folder Child", exact: true })
    .press("Enter");
  await page.getByTitle(assetTitle).waitFor();
});
