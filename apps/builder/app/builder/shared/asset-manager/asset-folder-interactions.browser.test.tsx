import { page, userEvent } from "@vitest/browser/context";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import "@webstudio-is/design-system/global.css";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import type { Asset } from "@webstudio-is/sdk";
import {
  createAssetFolderFixture,
  createAssetFoldersFixture,
} from "@webstudio-is/sdk/testing";
import { $authPermit } from "~/shared/nano-states";
import {
  $assetFolders,
  $assets,
  $pages,
  $project,
} from "~/shared/sync/data-stores";
import { registerContainers, serverSyncStore } from "~/shared/sync/sync-stores";
import { AssetManager } from "./asset-manager";
import { createAssetManagerTestRenderer } from "./test-utils";

const renderer = createAssetManagerTestRenderer();
registerContainers();

const asset = (id: string): Asset => ({
  id,
  projectId: "asset-folders",
  name: `${id}.txt`,
  format: "txt",
  type: "file",
  size: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  meta: {},
});

beforeEach(() => {
  $authPermit.set("build");
  $pages.set(createDefaultPages({ rootInstanceId: "body" }));
  $project.set({ id: "asset-folders" } as Project);
  $assetFolders.set(
    createAssetFoldersFixture(
      createAssetFolderFixture({ id: "parent", name: "Parent" }),
      createAssetFolderFixture({
        id: "child",
        name: "Child",
        parentId: "parent",
      })
    )
  );
  $assets.set(
    new Map([
      ["first", asset("first")],
      ["second", asset("second")],
    ])
  );
  renderer.render(
    <TooltipProvider>
      <div style={{ width: 400, height: 500, display: "flex" }}>
        <AssetManager canManageFolders />
      </div>
    </TooltipProvider>
  );
});

afterEach(() => {
  renderer.cleanup();
  $assetFolders.set(new Map());
  $assets.set(new Map());
  $pages.set(undefined);
  $project.set(undefined);
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
});

test("dragging a selected asset into a folder moves the entire selection", async () => {
  const first = page.getByTitle("first.txt");
  const second = page.getByTitle("second.txt");
  const folder = page.getByRole("button", {
    name: "Folder Parent",
    exact: true,
  });
  await act(async () => first.click());
  await act(async () => second.click({ modifiers: ["ControlOrMeta"] }));
  expect(page.getByRole("option", { selected: true }).elements()).toHaveLength(
    2
  );

  await act(async () => userEvent.dragAndDrop(second, folder));
  await expect.element(first).not.toBeInTheDocument();
  await expect.element(second).not.toBeInTheDocument();

  await act(async () => folder.dblClick());
  await expect.element(first).toBeVisible();
  await expect.element(second).toBeVisible();
});

test("asset settings move to the selected subfolder only after leaving the folder selector", async () => {
  const first = page.getByTitle("first.txt");
  await act(async () => {
    await first.hover();
    await page.getByRole("button", { name: "Actions for first.txt" }).click();
    await page.getByRole("menuitem", { name: "Settings" }).click();
  });
  const settings = page.getByText("Asset settings", { exact: true });
  const selectFolder = async (label: string, name: string) => {
    await act(async () => {
      await page.getByRole("combobox", { name: label, exact: true }).click();
      await page.getByRole("option", { name, exact: true }).click();
    });
    await expect.element(settings).toBeVisible();
    expect($assets.get().get("first")?.folderId).toBeUndefined();
  };

  await selectFolder("Folder", "Parent");
  await selectFolder("Asset subfolder level 1", "Child");

  await act(async () => page.getByRole("textbox", { name: "Name" }).click());
  await expect.element(settings).not.toBeInTheDocument();
  expect($assets.get().get("first")?.folderId).toBe("child");
  await act(async () =>
    page.getByRole("button", { name: "Folder Parent" }).dblClick()
  );
  await act(async () =>
    page.getByRole("button", { name: "Folder Child" }).dblClick()
  );
  await expect.element(first).toBeVisible();
});

test("dragging a selected folder into a folder moves the entire selection", async () => {
  act(() => {
    $assetFolders.set(
      createAssetFoldersFixture(
        createAssetFolderFixture({ id: "parent", name: "Parent" }),
        createAssetFolderFixture({ id: "alpha", name: "Alpha" }),
        createAssetFolderFixture({ id: "bravo", name: "Bravo" })
      )
    );
  });
  const alpha = page.getByRole("button", { name: "Folder Alpha", exact: true });
  const bravo = page.getByRole("button", { name: "Folder Bravo", exact: true });
  const parent = page.getByRole("button", {
    name: "Folder Parent",
    exact: true,
  });
  await act(async () => alpha.click());
  await act(async () => bravo.click({ modifiers: ["ControlOrMeta"] }));
  expect(page.getByRole("option", { selected: true }).elements()).toHaveLength(
    2
  );
  await act(async () => userEvent.dragAndDrop(bravo, parent));
  await expect.element(alpha).not.toBeInTheDocument();
  await expect.element(bravo).not.toBeInTheDocument();
  await act(async () => parent.dblClick());
  await expect.element(alpha).toBeVisible();
  await expect.element(bravo).toBeVisible();
});

test("the context menu moves all selected assets into the chosen folder", async () => {
  const first = page.getByTitle("first.txt");
  const second = page.getByTitle("second.txt");
  await act(async () => first.click());
  await act(async () => second.click({ modifiers: ["ControlOrMeta"] }));
  await act(async () => second.click({ button: "right" }));
  await act(async () =>
    page.getByRole("menuitem", { name: "Move", exact: true }).click()
  );
  const dialog = page.getByRole("dialog", { name: "Move items" });
  await act(async () =>
    dialog.getByRole("combobox", { name: "Folder", exact: true }).click()
  );
  await act(async () =>
    page.getByRole("option", { name: "Parent", exact: true }).click()
  );
  await act(async () =>
    dialog.getByRole("button", { name: "Move", exact: true }).click()
  );

  await expect.element(first).not.toBeInTheDocument();
  await expect.element(second).not.toBeInTheDocument();
  await act(async () =>
    page.getByRole("button", { name: "Folder Parent", exact: true }).dblClick()
  );
  await expect.element(first).toBeVisible();
  await expect.element(second).toBeVisible();
});
