import { Fragment, type ComponentProps } from "react";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { AssetThumbnail } from "./asset-thumbnail";
import { BackThumbnail, FolderThumbnail } from "./asset-folder-thumbnail";
import { createAssetFolderFixture } from "@webstudio-is/sdk/testing";
import { $assetManagerClipboard } from "./asset-manager-clipboard";
import { createAssetManagerTestRenderer } from "./test-utils";
import { $authPermit } from "~/shared/nano-states";
import type { AssetManagerThumbnailInteractions } from "./asset-manager-thumbnail";
import { $assetFolders, $assets, $project } from "~/shared/sync/data-stores";

const folder = createAssetFolderFixture({ id: "folder", name: "Documents" });
const uploadedAssetContainer: ComponentProps<
  typeof AssetThumbnail
>["assetContainer"] = {
  status: "uploaded",
  asset: {
    id: "asset",
    projectId: "project",
    name: "document.pdf",
    format: "pdf",
    size: 100,
    type: "file",
    meta: {},
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

const createInteractions = (
  onSelectionChange = vi.fn()
): AssetManagerThumbnailInteractions => ({
  onSelectionChange: (_item, selected) => onSelectionChange(selected),
  onItemPointerDown: vi.fn(),
  onItemClick: vi.fn(),
  onModifiedArrow: vi.fn(),
  onContextMenuSelection: vi.fn(),
  onContextMenuActions: vi.fn(),
  getDragItems: (item) => [item],
});

const createFolderThumbnail = (
  props: Partial<ComponentProps<typeof FolderThumbnail>> = {}
) => (
  <FolderThumbnail
    folder={folder}
    selected={false}
    canManage={false}
    interactions={createInteractions()}
    canMoveItems={() => false}
    onOpen={vi.fn()}
    onMoveItems={vi.fn()}
    {...props}
  />
);

const createUploadedAssetThumbnail = (
  props: Partial<ComponentProps<typeof AssetThumbnail>> = {}
) => (
  <AssetThumbnail
    assetContainer={uploadedAssetContainer}
    interactions={createInteractions()}
    {...props}
  />
);

const openSettingsFromActionsMenu = ({
  container,
  triggerLabel,
  settingsTitle,
}: {
  container: HTMLElement;
  triggerLabel: string;
  settingsTitle: string;
}) => {
  const actions = container.querySelector<HTMLButtonElement>(
    `[aria-label="${triggerLabel}"]`
  );
  act(() => {
    actions?.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, button: 0 })
    );
  });

  expect(document.body.textContent).not.toContain(settingsTitle);
  const menuItems = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
  );
  const settings = menuItems.find((item) => item.textContent === "Settings");
  const rename = menuItems.find((item) => item.textContent === "Rename");
  expect(settings).toBeDefined();
  expect(rename).toBeUndefined();
  act(() => settings?.click());
};

const renderer = createAssetManagerTestRenderer();
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);
beforeEach(() => {
  $authPermit.set("build");
  $project.set({ id: "project" } as never);
  $assetFolders.set(new Map([[folder.id, folder]]));
  if (uploadedAssetContainer.status === "uploaded") {
    $assets.set(
      new Map([[uploadedAssetContainer.asset.id, uploadedAssetContainer.asset]])
    );
  }
});
afterEach(() => {
  renderer.cleanup();
  $assetManagerClipboard.set(undefined);
  $assetFolders.set(new Map());
  $assets.set(new Map());
  $project.set(undefined);
});

describe("AssetThumbnail", () => {
  test.each([
    {
      triggerLabel: "Actions for Documents",
      render: (onMove: () => void) =>
        createFolderThumbnail({ canManage: true, onMove }),
    },
    {
      triggerLabel: "Actions for document.pdf",
      render: (onMove: () => void) => createUploadedAssetThumbnail({ onMove }),
    },
  ])("moves from the $triggerLabel menu", ({ triggerLabel, render }) => {
    const onMove = vi.fn();
    const container = renderer.render(render(onMove));
    const trigger = container.querySelector<HTMLButtonElement>(
      `[aria-label="${triggerLabel}"]`
    );
    act(() => {
      trigger?.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, button: 0 })
      );
    });
    const move = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === "Move");
    expect(move).toBeDefined();

    act(() => move?.click());

    expect(onMove).toHaveBeenCalledOnce();
  });

  test("renders asset, folder, and Back components through the shared card", () => {
    const container = renderer.render(
      <Fragment>
        <AssetThumbnail
          assetContainer={{
            status: "uploading",
            objectURL: "blob:document",
            asset: {
              id: "asset",
              name: "document.pdf",
              filename: undefined,
              format: "pdf",
              description: undefined,
              type: "file",
              folderId: "folder",
            },
          }}
          interactions={createInteractions()}
        />
        {createFolderThumbnail()}
        <BackThumbnail onOpen={vi.fn()} />
      </Fragment>
    );

    const thumbnails = container.querySelectorAll("[data-asset-thumbnail]");
    const managedThumbnails = container.querySelectorAll(
      "[data-asset-manager-thumbnail]"
    );
    expect(thumbnails).toHaveLength(3);
    expect(managedThumbnails).toHaveLength(2);
    expect(thumbnails[0]?.tagName).toBe("BUTTON");
    expect(thumbnails[1]?.tagName).toBe("BUTTON");
    expect(thumbnails[2]?.tagName).toBe("BUTTON");
    expect(container.textContent).toContain("document.pdf");
    expect(container.textContent).toContain("Documents");
    expect(container.textContent).toContain("Back");

    const backIcon = thumbnails[2]?.querySelector("svg");
    expect(backIcon?.children).toHaveLength(1);
    expect(backIcon?.firstElementChild?.tagName).toBe("path");
    expect(backIcon?.firstElementChild?.getAttribute("vector-effect")).toBe(
      "non-scaling-stroke"
    );
  });

  test("uses focus for folder selection and opens only on activation", () => {
    const onOpen = vi.fn();
    const onSelectionChange = vi.fn();
    const container = renderer.render(
      createFolderThumbnail({
        selected: true,
        forcedSelection: true,
        interactions: createInteractions(onSelectionChange),
        onOpen,
      })
    );

    const button = container.querySelector("button");
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    expect(
      button?.closest('[role="option"]')?.getAttribute("aria-selected")
    ).toBe("true");
    button?.focus();
    expect(onSelectionChange).toHaveBeenLastCalledWith(true);
    outside.focus();
    expect(onSelectionChange).toHaveBeenLastCalledWith(false);

    button?.click();
    expect(onOpen).not.toHaveBeenCalled();

    button?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(onOpen).toHaveBeenCalledOnce();

    button?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    expect(onOpen).toHaveBeenCalledTimes(2);

    button?.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true })
    );
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  test("opens an asset from double click, keyboard, context, and dropdown actions", () => {
    const onOpen = vi.fn();
    const interactions = createInteractions();
    const container = renderer.render(
      <TooltipProvider>
        {createUploadedAssetThumbnail({ interactions, onOpen })}
      </TooltipProvider>
    );
    const card = container.querySelector<HTMLButtonElement>(
      "[data-asset-manager-thumbnail-button]"
    );

    card?.click();
    expect(onOpen).not.toHaveBeenCalled();

    card?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(onOpen).toHaveBeenCalledOnce();

    card?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    expect(onOpen).toHaveBeenCalledTimes(2);

    card?.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        button: 2,
        cancelable: true,
      })
    );
    expect(interactions.onContextMenuActions).toHaveBeenCalledWith(
      expect.objectContaining({ open: onOpen })
    );

    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Actions for document.pdf"]'
        )
        ?.dispatchEvent(
          new MouseEvent("pointerdown", { bubbles: true, button: 0 })
        );
    });
    const open = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === "Open");
    expect(open).toBeDefined();

    act(() => open?.click());
    expect(onOpen).toHaveBeenCalledTimes(3);
  });

  describe.each([
    {
      variant: "folder",
      thumbnailLabel: "Folder Documents",
      triggerLabel: "Actions for Documents",
      settingsTitle: "Folder settings",
      shortcutActions: ["Cut", "Copy", "Paste", "Duplicate", "Delete"],
      render: () => createFolderThumbnail({ canManage: true }),
    },
    {
      variant: "asset",
      thumbnailLabel: undefined,
      triggerLabel: "Actions for document.pdf",
      settingsTitle: "Asset settings",
      shortcutActions: ["Cut", "Copy", "Duplicate", "Delete"],
      render: createUploadedAssetThumbnail,
    },
  ])("$variant thumbnail actions", (thumbnail) => {
    const render = () =>
      renderer.render(<TooltipProvider>{thumbnail.render()}</TooltipProvider>);

    test("skips actions with Tab and reaches them with arrow keys", () => {
      const container = render();
      const card = container.querySelector<HTMLButtonElement>(
        thumbnail.thumbnailLabel === undefined
          ? "[data-asset-thumbnail]"
          : `[aria-label="${thumbnail.thumbnailLabel}"]`
      );
      const actions = container.querySelector<HTMLButtonElement>(
        `[aria-label="${thumbnail.triggerLabel}"]`
      );

      expect(card?.tabIndex).toBe(0);
      expect(actions?.tabIndex).toBe(-1);
      expect(
        actions?.closest("header")?.getAttribute("data-asset-thumbnail-header")
      ).toBe("");

      card?.focus();
      card?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      );
      expect(document.activeElement).toBe(actions);

      actions?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
      );
      expect(document.activeElement).toBe(card);
    });

    test("opens settings from the actions menu", () => {
      const container = render();
      openSettingsFromActionsMenu({
        container,
        triggerLabel: thumbnail.triggerLabel,
        settingsTitle: thumbnail.settingsTitle,
      });
      expect(document.body.textContent).toContain(thumbnail.settingsTitle);
      expect(
        document
          .querySelector('[role="dialog"]')
          ?.querySelector('[aria-label="Actions"]')
      ).toBeNull();
    });

    test("shows keyboard shortcuts in the actions menu", () => {
      $assetManagerClipboard.set({
        operation: "copy",
        items: [{ type: "asset", id: "asset" }],
        projectId: "project",
      });
      const container = render();
      act(() => {
        container
          .querySelector<HTMLButtonElement>(
            `[aria-label="${thumbnail.triggerLabel}"]`
          )
          ?.dispatchEvent(
            new MouseEvent("pointerdown", { bubbles: true, button: 0 })
          );
      });
      const menuItems = Array.from(
        document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
      );

      for (const label of thumbnail.shortcutActions) {
        const item = menuItems.find((item) =>
          item.textContent?.startsWith(label)
        );
        expect(item?.querySelector("kbd"), label).toBeInstanceOf(HTMLElement);
      }
    });
  });

  test("shows the unused asset indicator in the thumbnail", () => {
    const container = renderer.render(
      <TooltipProvider>{createUploadedAssetThumbnail()}</TooltipProvider>
    );

    const header = container.querySelector<HTMLElement>(
      "header[data-asset-thumbnail-header]"
    );
    expect(
      header?.querySelector('[role="img"][aria-label="Unused asset"]')
    ).toBeInstanceOf(HTMLElement);
    expect(
      header?.querySelector('[aria-label="Actions for document.pdf"]')
    ).toBeInstanceOf(HTMLButtonElement);
  });

  test("does not offer paste from another project on a folder", () => {
    $assetManagerClipboard.set({
      operation: "copy",
      items: [
        {
          type: "asset",
          id: "asset",
        },
      ],
      projectId: "another-project",
    });
    const container = renderer.render(
      <TooltipProvider>
        {createFolderThumbnail({ canManage: true })}
      </TooltipProvider>
    );
    const actions = container.querySelector<HTMLButtonElement>(
      '[aria-label="Actions for Documents"]'
    );
    act(() => {
      actions?.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, button: 0 })
      );
    });

    expect(
      Array.from(document.body.querySelectorAll('[role="menuitem"]')).some(
        (item) => item.textContent === "Paste"
      )
    ).toBe(false);
  });
});
