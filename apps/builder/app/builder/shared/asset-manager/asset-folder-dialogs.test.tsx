import { useState, type ReactNode } from "react";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $assetFolders, $project } from "~/shared/sync/data-stores";
import {
  AssetFolderSettingsDialog,
  assertCollectionSetupProject,
  CreateAssetFolderDialog,
  getCollectionFolderSyncError,
  MoveAssetManagerItemsDialog,
} from "./asset-folder-dialogs";
import {
  createAssetFolderFixture,
  createAssetFoldersFixture,
} from "@webstudio-is/sdk/testing";
import { createAssetManagerTestRenderer } from "./test-utils";
import { uploadSingleAsset } from "~/builder/shared/assets/upload-assets";

const renderer = createAssetManagerTestRenderer();
const render = (children: ReactNode) =>
  renderer.render(<TooltipProvider>{children}</TooltipProvider>);

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

afterEach(() => {
  renderer.cleanup();
  $assetFolders.set(new Map());
  $project.set(undefined);
  vi.unstubAllGlobals();
});

test("Escape closes folder settings without closing the assets panel", () => {
  const folder = createAssetFolderFixture({
    id: "folder",
    name: "Documents",
  });
  $assetFolders.set(createAssetFoldersFixture(folder));
  const onPanelClose = vi.fn();
  const onSettingsOpenChange = vi.fn();

  render(
    <div
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onPanelClose();
        }
      }}
    >
      <AssetFolderSettingsDialog
        folder={folder}
        open
        onOpenChange={onSettingsOpenChange}
      />
    </div>
  );

  act(() => {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
  });

  expect(onSettingsOpenChange).toHaveBeenCalledWith(false);
  expect(onPanelClose).not.toHaveBeenCalled();
});

test.each([
  { initialDeleteConfirmation: false, focusedAction: "Save" },
  { initialDeleteConfirmation: true, focusedAction: "Delete folder" },
])(
  "focuses $focusedAction as the rightmost folder settings action",
  ({ initialDeleteConfirmation, focusedAction }) => {
    const folder = createAssetFolderFixture({
      id: "folder",
      name: "Documents",
    });
    $assetFolders.set(createAssetFoldersFixture(folder));

    render(
      <AssetFolderSettingsDialog
        folder={folder}
        open
        onOpenChange={vi.fn()}
        initialDeleteConfirmation={initialDeleteConfirmation}
      />
    );

    expect(document.activeElement?.textContent).toBe(focusedAction);
  }
);

test("shows the folder name and ID in settings", () => {
  const folder = createAssetFolderFixture({
    id: "folder-id",
    name: "Documents",
  });
  $assetFolders.set(createAssetFoldersFixture(folder));

  render(
    <AssetFolderSettingsDialog folder={folder} open onOpenChange={vi.fn()} />
  );

  expect(
    document.querySelector('label[for="asset-folder-name-folder-id"]')
      ?.textContent
  ).toBe("Name");
  expect(
    document.querySelector<HTMLInputElement>("#asset-folder-id-folder-id")
      ?.value
  ).toBe(folder.id);
  expect(
    document.querySelector('[aria-label="Copy folder ID"]')
  ).toBeInstanceOf(HTMLButtonElement);
});

test("focuses the folder name while the rightmost Create action is disabled", () => {
  render(
    <CreateAssetFolderDialog
      open
      onOpenChange={vi.fn()}
      currentFolderId={undefined}
    />
  );

  expect(document.activeElement).toBe(
    document.querySelector("#asset-folder-name")
  );
  expect(
    Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Create folder"
    )?.disabled
  ).toBe(true);
});

test("hides collection creation from content editors", () => {
  render(
    <CreateAssetFolderDialog
      open
      onOpenChange={vi.fn()}
      currentFolderId={undefined}
      canCreateContentCollection={false}
    />
  );

  expect(document.body.textContent).not.toContain("Use as content collection");
});

test.each([
  ["failure", "could not be synchronized"],
  ["timeout", "timed out"],
] as const)("explains a collection folder %s", (result, message) => {
  expect(getCollectionFolderSyncError(result)).toContain(message);
});

test("stops collection setup after the active project changes", () => {
  expect(() =>
    assertCollectionSetupProject({
      expectedProjectId: "original-project",
      currentProjectId: "next-project",
    })
  ).toThrow("project changed");
});

test("keeps an incomplete collection setup when the dialog closes", async () => {
  $project.set({ id: "project" } as never);
  const createFolder = vi.fn(() => ({
    folderId: "new-folder",
    transactionId: "folder-transaction",
  }));
  const waitForFolderSync = vi.fn(async () => "timeout" as const);
  const Harness = () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button onClick={() => setOpen(true)}>Reopen</button>
        <CreateAssetFolderDialog
          open={open}
          onOpenChange={setOpen}
          currentFolderId={undefined}
          createFolder={createFolder}
          waitForFolderSync={waitForFolderSync}
        />
      </>
    );
  };
  render(<Harness />);

  const name = document.querySelector<HTMLInputElement>("#asset-folder-name");
  if (name === null) {
    throw new Error("Expected folder name field");
  }
  act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;
    valueSetter?.call(name, "Posts");
    name.dispatchEvent(new InputEvent("input", { bubbles: true }));
    document
      .querySelector<HTMLElement>("#asset-folder-content-collection")
      ?.click();
  });
  await act(async () => {
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Create folder")
      ?.click();
  });
  expect(document.body.textContent).toContain("timed out");

  act(() => {
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Finish later")
      ?.click();
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Reopen")
      ?.click();
  });

  expect(document.body.textContent).toContain("Finish collection setup");
  expect(createFolder).toHaveBeenCalledOnce();
  await act(async () => {
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Retry setup")
      ?.click();
  });
  expect(waitForFolderSync).toHaveBeenNthCalledWith(1, "folder-transaction");
  expect(waitForFolderSync).toHaveBeenNthCalledWith(2, "folder-transaction");
});

test("deduplicates collection seed uploads so setup can be retried", async () => {
  $project.set({ id: "project" } as never);
  const createFolder = vi.fn(() => ({
    folderId: "new-folder",
    transactionId: "folder-transaction",
  }));
  const waitForFolderSync = vi.fn(async () => "success" as const);
  const uploadAsset = vi.fn<typeof uploadSingleAsset>(
    async () => ({ id: "asset" }) as never
  );
  const onConfigureCollection = vi.fn();
  render(
    <CreateAssetFolderDialog
      open
      onOpenChange={vi.fn()}
      onConfigureCollection={onConfigureCollection}
      currentFolderId={undefined}
      createFolder={createFolder}
      waitForFolderSync={waitForFolderSync}
      uploadAsset={uploadAsset}
    />
  );

  const name = document.querySelector<HTMLInputElement>("#asset-folder-name");
  if (name === null) {
    throw new Error("Expected folder name field");
  }
  act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;
    valueSetter?.call(name, "Posts");
    name.dispatchEvent(new InputEvent("input", { bubbles: true }));
    document
      .querySelector<HTMLElement>("#asset-folder-content-collection")
      ?.click();
  });
  await act(async () => {
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Create folder")
      ?.click();
  });

  await vi.waitFor(() => expect(uploadAsset).toHaveBeenCalledTimes(2));
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain("Collection created")
  );
  act(() => {
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Configure collection")
      ?.click();
  });
  expect(onConfigureCollection).toHaveBeenCalledWith("new-folder");
  expect(
    uploadAsset.mock.calls.map(([type, file, options]) => ({
      type,
      filename: file.name,
      options,
    }))
  ).toEqual([
    {
      type: "file",
      filename: "template.mdx",
      options: { folderId: "new-folder", deduplicate: true },
    },
    {
      type: "file",
      filename: "collection.json",
      options: { folderId: "new-folder", deduplicate: true },
    },
  ]);
});

test("moves items to the selected folder from the folder-only dialog", () => {
  const destination = createAssetFolderFixture({
    id: "destination",
    name: "Destination",
  });
  $assetFolders.set(createAssetFoldersFixture(destination));
  const onMove = vi.fn();
  const onClose = vi.fn();

  render(
    <MoveAssetManagerItemsDialog
      initialFolderId={destination.id}
      canMove={() => true}
      onMove={onMove}
      onClose={onClose}
    />
  );

  expect(document.querySelectorAll("label")).toHaveLength(1);
  expect(document.querySelector("label")?.textContent).toBe("Folder");
  expect(document.activeElement?.textContent).toBe("Move");

  act(() => {
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Move")
      ?.click();
  });

  expect(onMove).toHaveBeenCalledWith(destination.id);
  expect(onClose).toHaveBeenCalledOnce();
});
