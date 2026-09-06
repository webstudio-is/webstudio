import { Fragment, useState, type ComponentProps } from "react";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { AssetThumbnail } from "./asset-thumbnail";
import { BackThumbnail, FolderThumbnail } from "./asset-folder-thumbnail";
import type { Asset } from "@webstudio-is/sdk";
import { createAssetFolderFixture } from "@webstudio-is/sdk/testing";
import { $assetManagerClipboard } from "./asset-manager-clipboard";
import { createAssetManagerTestRenderer } from "./test-utils";
import {
  $authPermit,
  $builderMode,
  $selectedPageId,
} from "~/shared/nano-states";
import type { AssetManagerThumbnailInteractions } from "./asset-manager-thumbnail";
import {
  $assetFolders,
  $assets,
  $pages,
  $project,
} from "~/shared/sync/data-stores";
import {
  createDefaultCollectionConfig,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import { createDefaultPages } from "@webstudio-is/project-build";
import { registerContainers, serverSyncStore } from "~/shared/sync/sync-stores";

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

const setControlValue = (
  control: HTMLInputElement | HTMLTextAreaElement,
  value: string
) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    control instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype,
    "value"
  )?.set;
  valueSetter?.call(control, value);
  control.dispatchEvent(new InputEvent("input", { bubbles: true }));
};

const selectFolderOption = (label: string) => {
  const trigger = document.querySelector<HTMLButtonElement>(
    '[aria-label="Folder"]'
  );
  act(() => {
    trigger?.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        pointerId: 1,
        pointerType: "mouse",
      })
    );
  });
  const option = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((candidate) => candidate.textContent === label);
  if (option === undefined) {
    throw new Error(`Expected folder option ${label}`);
  }
  act(() => {
    option.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        pointerId: 1,
        pointerType: "mouse",
      })
    );
    option.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        button: 0,
        pointerId: 1,
        pointerType: "mouse",
      })
    );
  });
};

const renderer = createAssetManagerTestRenderer();
registerContainers();
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);
beforeEach(() => {
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
  const pages = createDefaultPages({ rootInstanceId: "body" });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  $authPermit.set("build");
  $builderMode.set("design");
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
  $pages.set(undefined);
});

describe("AssetThumbnail", () => {
  test.each([
    { action: "Settings", openTitle: "Asset settings" },
    { action: "Delete", openTitle: "Delete asset?" },
  ])(
    "closes an open $action control when the asset becomes collection-reserved",
    ({ action, openTitle }) => {
      const templateAsset: Asset = {
        id: "template",
        projectId: "project",
        name: "template.mdx",
        filename: "template",
        folderId: folder.id,
        format: "mdx",
        size: 1,
        type: "file",
        meta: {},
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      $authPermit.set("edit");
      $assets.set(new Map([[templateAsset.id, templateAsset]]));
      let reserveAsset: () => void = () => undefined;
      const DynamicAssetThumbnail = () => {
        const [reserved, setReserved] = useState(false);
        reserveAsset = () => setReserved(true);
        return (
          <AssetThumbnail
            assetContainer={{ status: "uploaded", asset: templateAsset }}
            interactions={createInteractions()}
            isCollectionEntry={reserved}
            isCollectionReserved={reserved}
          />
        );
      };
      const container = renderer.render(
        <TooltipProvider>
          <DynamicAssetThumbnail />
        </TooltipProvider>
      );
      act(() => {
        container
          .querySelector<HTMLButtonElement>(
            '[aria-label="Actions for template.mdx"]'
          )
          ?.dispatchEvent(
            new MouseEvent("pointerdown", { bubbles: true, button: 0 })
          );
      });
      const actionItem = Array.from(
        document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
      ).find((item) => item.textContent?.startsWith(action));
      expect(actionItem).toBeDefined();
      act(() => actionItem?.click());
      expect(document.body.textContent).toContain(openTitle);

      act(reserveAsset);

      expect(document.body.textContent).not.toContain(openTitle);
    }
  );

  test("closes an open asset delete confirmation when authorization becomes view-only", () => {
    const container = renderer.render(
      <TooltipProvider>{createUploadedAssetThumbnail()}</TooltipProvider>
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
    const deleteAction = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent?.startsWith("Delete"));
    expect(deleteAction).toBeDefined();
    act(() => deleteAction?.click());
    expect(document.body.textContent).toContain("Delete asset?");

    act(() => $authPermit.set("view"));

    expect(document.body.textContent).not.toContain("Delete asset?");
  });

  test("discards pending settings when an asset becomes collection-reserved", async () => {
    const targetFolder = createAssetFolderFixture({
      id: "target",
      name: "Target",
    });
    const templateAsset: Asset = {
      id: "template",
      projectId: "project",
      name: "template.mdx",
      filename: "template",
      description: "Original description",
      folderId: folder.id,
      format: "mdx",
      size: 1,
      type: "file",
      meta: {},
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    $authPermit.set("edit");
    $assetFolders.set(
      new Map([
        [folder.id, folder],
        [targetFolder.id, targetFolder],
      ])
    );
    $assets.set(new Map([[templateAsset.id, templateAsset]]));
    let reserveAsset: () => void = () => undefined;
    const DynamicAssetThumbnail = () => {
      const [reserved, setReserved] = useState(false);
      reserveAsset = () => setReserved(true);
      return (
        <AssetThumbnail
          assetContainer={{ status: "uploaded", asset: templateAsset }}
          interactions={createInteractions()}
          isCollectionEntry={reserved}
          isCollectionReserved={reserved}
        />
      );
    };
    const container = renderer.render(
      <TooltipProvider>
        <DynamicAssetThumbnail />
      </TooltipProvider>
    );
    openSettingsFromActionsMenu({
      container,
      triggerLabel: "Actions for template.mdx",
      settingsTitle: "Asset settings",
    });
    const filename = document.querySelector<HTMLInputElement>(
      "#asset-manager-filename"
    );
    const description = document.querySelector<HTMLTextAreaElement>(
      "#asset-manager-description"
    );
    if (filename === null || description === null) {
      throw new Error("Expected editable asset settings");
    }
    act(() => {
      setControlValue(filename, "renamed.mdx");
      setControlValue(description, "Pending description");
    });
    selectFolderOption(targetFolder.name);

    act(reserveAsset);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 550));
    });

    expect($assets.get().get(templateAsset.id)).toMatchObject({
      filename: templateAsset.filename,
      description: templateAsset.description,
      folderId: templateAsset.folderId,
    });
  });

  test("saves pending settings on an ordinary unmount", () => {
    const targetFolder = createAssetFolderFixture({
      id: "target",
      name: "Target",
    });
    $assetFolders.set(
      new Map([
        [folder.id, folder],
        [targetFolder.id, targetFolder],
      ])
    );
    const container = renderer.render(
      <TooltipProvider>{createUploadedAssetThumbnail()}</TooltipProvider>
    );
    openSettingsFromActionsMenu({
      container,
      triggerLabel: "Actions for document.pdf",
      settingsTitle: "Asset settings",
    });
    const filename = document.querySelector<HTMLInputElement>(
      "#asset-manager-filename"
    );
    const description = document.querySelector<HTMLTextAreaElement>(
      "#asset-manager-description"
    );
    if (filename === null || description === null) {
      throw new Error("Expected editable asset settings");
    }
    act(() => {
      setControlValue(filename, "renamed.pdf");
      setControlValue(description, "Saved description");
    });
    selectFolderOption(targetFolder.name);

    renderer.cleanup();

    expect($assets.get().get("asset")).toMatchObject({
      filename: "renamed",
      description: "Saved description",
      folderId: targetFolder.id,
    });
  });

  test.each([
    {
      context: "a different project",
      projectId: "other-project",
      name: uploadedAssetContainer.asset.name,
    },
    {
      context: "a replacement asset revision",
      projectId: uploadedAssetContainer.asset.projectId,
      name: "replacement-document.pdf",
    },
  ])("does not save pending settings into $context", ({ projectId, name }) => {
    const targetFolder = createAssetFolderFixture({
      id: "target",
      name: "Target",
    });
    $assetFolders.set(
      new Map([
        [folder.id, folder],
        [targetFolder.id, targetFolder],
      ])
    );
    const container = renderer.render(
      <TooltipProvider>{createUploadedAssetThumbnail()}</TooltipProvider>
    );
    openSettingsFromActionsMenu({
      container,
      triggerLabel: "Actions for document.pdf",
      settingsTitle: "Asset settings",
    });
    const filename = document.querySelector<HTMLInputElement>(
      "#asset-manager-filename"
    );
    const description = document.querySelector<HTMLTextAreaElement>(
      "#asset-manager-description"
    );
    if (filename === null || description === null) {
      throw new Error("Expected editable asset settings");
    }
    act(() => {
      setControlValue(filename, "pending.pdf");
      setControlValue(description, "Pending description");
    });
    selectFolderOption(targetFolder.name);

    const currentAsset = {
      ...uploadedAssetContainer.asset,
      projectId,
      name,
      filename: "current-document",
      description: "Current description",
    };
    act(() => {
      $project.set({ id: projectId } as never);
      $assets.set(new Map([[currentAsset.id, currentAsset]]));
    });
    renderer.cleanup();

    expect($assets.get().get(currentAsset.id)).toEqual(currentAsset);
  });

  test("hides collection settings from edit-only users", () => {
    const configAsset: Asset = {
      id: "config",
      projectId: "project",
      name: "collection.json",
      filename: "collection",
      format: "json",
      folderId: folder.id,
      type: "file",
      size: 1,
      description: null,
      createdAt: "2026-09-02T00:00:00.000Z",
      meta: {},
    };
    const templateAsset: Asset = {
      id: "template",
      projectId: "project",
      name: "template.mdx",
      filename: "template",
      format: "mdx",
      folderId: folder.id,
      type: "file",
      size: 1,
      description: null,
      createdAt: "2026-09-02T00:00:00.000Z",
      meta: {},
    };
    $authPermit.set("edit");
    const container = renderer.render(
      createFolderThumbnail({
        canManage: true,
        collection: {
          status: "ready",
          folderId: folder.id,
          configAsset,
          templateAsset,
          config: parseCollectionConfig(createDefaultCollectionConfig()),
          templateProperties: { draft: true },
        },
      })
    );
    const actions = container.querySelector<HTMLButtonElement>(
      '[aria-label="Actions for Documents"]'
    );

    act(() => {
      actions?.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, button: 0 })
      );
    });

    const labels = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).map((item) => item.textContent);
    expect(labels).toContain("Settings");
    expect(labels).not.toContain("Collection settings");
  });

  test("keeps the opened collection revision while settings have unsaved edits", async () => {
    const configAsset: Asset = {
      id: "config",
      projectId: "project",
      name: "collection.json",
      filename: "collection",
      format: "json",
      folderId: folder.id,
      type: "file",
      size: 1,
      description: null,
      createdAt: "2026-09-02T00:00:00.000Z",
      meta: {},
    };
    const templateAsset: Asset = {
      id: "template",
      projectId: "project",
      name: "template.mdx",
      filename: "template",
      format: "mdx",
      folderId: folder.id,
      type: "file",
      size: 1,
      description: null,
      createdAt: "2026-09-02T00:00:00.000Z",
      meta: {},
    };
    const initialCollection = {
      status: "ready" as const,
      folderId: folder.id,
      configAsset,
      templateAsset,
      config: parseCollectionConfig(createDefaultCollectionConfig()),
      templateProperties: { draft: true },
    };
    let receiveRemoteUpdate: () => void = () => undefined;
    const DynamicFolderThumbnail = () => {
      const [collection, setCollection] = useState(initialCollection);
      receiveRemoteUpdate = () =>
        setCollection({
          ...initialCollection,
          templateAsset: {
            ...templateAsset,
            name: "remote-template.mdx",
            filename: "remote-template",
          },
        });
      return createFolderThumbnail({
        canManage: true,
        collection,
      });
    };
    const container = renderer.render(
      <TooltipProvider>
        <DynamicFolderThumbnail />
      </TooltipProvider>
    );
    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Actions for Documents"]'
        )
        ?.dispatchEvent(
          new MouseEvent("pointerdown", { bubbles: true, button: 0 })
        );
    });
    const collectionSettings = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === "Collection settings");
    expect(collectionSettings).toBeDefined();
    await act(async () => collectionSettings?.click());
    const templateName = document.querySelector<HTMLInputElement>(
      '[aria-label="Entry template name"]'
    );
    if (templateName === null) {
      throw new Error("Expected entry template name");
    }
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      valueSetter?.call(templateName, "draft-template");
      templateName.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });

    await act(async () => receiveRemoteUpdate());

    expect(templateName.value).toBe("draft-template");
  });

  test("describes collection folders without advertising blocked file drops", () => {
    const configAsset: Asset = {
      id: "config",
      projectId: "project",
      name: "collection.json",
      filename: "collection",
      format: "json",
      folderId: folder.id,
      type: "file",
      size: 1,
      description: null,
      createdAt: "2026-09-02T00:00:00.000Z",
      meta: {},
    };
    const templateAsset: Asset = {
      id: "template",
      projectId: "project",
      name: "template.mdx",
      filename: "template",
      format: "mdx",
      folderId: folder.id,
      type: "file",
      size: 1,
      description: null,
      createdAt: "2026-09-02T00:00:00.000Z",
      meta: {},
    };
    const container = renderer.render(
      createFolderThumbnail({
        collection: {
          status: "ready",
          folderId: folder.id,
          configAsset,
          templateAsset,
          config: parseCollectionConfig(createDefaultCollectionConfig()),
          templateProperties: { draft: true },
        },
      })
    );

    const thumbnail = container.querySelector(
      '[aria-label="Folder Documents"]'
    );
    expect(thumbnail?.getAttribute("aria-description")).toBe(
      "Content collection. Double-click to open. Only folders can be moved here."
    );
    const collectionIcon = thumbnail?.querySelector(
      "[data-collection-folder-icon]"
    );
    expect(collectionIcon).toBeInstanceOf(SVGElement);
    expect(
      collectionIcon?.querySelector('path[stroke="currentColor"]')
    ).toBeInstanceOf(SVGElement);
  });

  test("keeps collection entry filenames read-only", () => {
    const container = renderer.render(
      <TooltipProvider>
        {createUploadedAssetThumbnail({ isCollectionEntry: true })}
      </TooltipProvider>
    );
    openSettingsFromActionsMenu({
      container,
      triggerLabel: "Actions for document.pdf",
      settingsTitle: "Asset settings",
    });

    expect(
      document.querySelector<HTMLInputElement>("#asset-manager-filename")
        ?.readOnly
    ).toBe(true);
  });

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

  test("falls back to a file preview when the browser cannot decode a video", () => {
    const container = renderer.render(
      <AssetThumbnail
        assetContainer={{
          status: "uploaded",
          asset: {
            id: "video-asset",
            projectId: "project",
            name: "sample.avi",
            format: "avi",
            size: 100,
            type: "video",
            meta: { width: 640, height: 360 },
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        }}
        interactions={createInteractions()}
      />
    );
    const video = container.querySelector("video");
    expect(video).toBeInstanceOf(HTMLVideoElement);

    act(() => video?.dispatchEvent(new Event("error", { bubbles: true })));

    expect(container.querySelector("video")).toBeNull();
    expect(container.textContent).toContain("AVI");
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
