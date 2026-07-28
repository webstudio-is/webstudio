import type { ReactNode } from "react";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $assetFolders } from "~/shared/sync/data-stores";
import {
  AssetFolderSettingsDialog,
  CreateAssetFolderDialog,
  MoveAssetManagerItemsDialog,
} from "./asset-folder-dialogs";
import {
  createAssetFolderFixture,
  createAssetFoldersFixture,
} from "@webstudio-is/sdk/testing";
import { createAssetManagerTestRenderer } from "./test-utils";

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
