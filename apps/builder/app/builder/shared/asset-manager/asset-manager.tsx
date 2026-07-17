import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useStore } from "@nanostores/react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Flex,
  Grid,
  Text,
  findNextListItemIndex,
  theme,
  useSearchFieldKeys,
} from "@webstudio-is/design-system";
import { TrashIcon } from "@webstudio-is/icons";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  acceptToMimePatterns,
  createAssetFolderHierarchy,
  doesAssetMatchMimePatterns,
  type Asset,
  type AllowedFileExtension,
} from "@webstudio-is/sdk";
import { AssetsShell, useAssets } from "../assets";
import { AssetThumbnail } from "./asset-thumbnail";
import { BackThumbnail, FolderThumbnail } from "./asset-folder-thumbnail";
import { AssetFilters } from "./asset-filters";
import { AssetSortSelect } from "./asset-sort";
import { $assetFolders, $project } from "~/shared/sync/data-stores";
import { AssetFolderBreadcrumbs } from "./asset-folder-breadcrumbs";
import {
  filterAssetFolders,
  formatAssetFolderPath,
  sortAssetFolders,
} from "./asset-folder-utils";
import {
  getInitialExtensions,
  calculateFormatCounts,
  filterAndSortAssets,
  getAssetManagerSelectionIndex,
  getNearestAssetManagerSelection,
  isAssetManagerSelectionVisible,
  type AssetManagerSelection,
  type SortState,
} from "./utils";
import {
  $assetManagerClipboard,
  canPasteAssetManagerClipboard,
  copyAssetManagerItems,
  cutAssetManagerItems,
  pasteAssetManagerClipboard,
} from "./asset-manager-clipboard";
import {
  AssetManagerItemContextMenuContent,
  type AssetManagerItemActions,
} from "./asset-manager-item-menu";
import {
  addAssetManagerSelection,
  getAdjacentAssetManagerSelection,
  getAssetManagerSelectionKey,
  getAssetManagerSelectionRange,
  includesAssetManagerSelection,
  isSameAssetManagerSelection,
  toggleAssetManagerSelection,
} from "./asset-manager-selection";
import {
  startAssetManagerMarquee,
  type AssetManagerMarqueeRect,
} from "./asset-manager-marquee";
import {
  canMoveAssetManagerItems,
  deleteAssetManagerItems,
  duplicateAssetManagerItems,
  moveAssetManagerItems,
  normalizeAssetManagerItems,
  type AssetManagerItem,
} from "./asset-manager-operations";
import { getAssetManagerDragItems } from "./asset-manager-drag";
import type { AssetManagerThumbnailInteractions } from "./asset-manager-thumbnail";
import { $authPermit } from "~/shared/nano-states";
import { MoveAssetManagerItemsDialog } from "./asset-folder-dialogs";

type FolderNavigationProps =
  | { folderId?: never; onFolderChange?: never }
  | {
      folderId: string | undefined;
      onFolderChange: (folderId: string | undefined) => void;
    };

type AssetManagerProps = FolderNavigationProps & {
  onChange?: (assetId: Asset["id"]) => void;
  /** acceptable file types in the `<input accept>` attribute format */
  accept?: string;
  canManageFolders?: boolean;
  panelActions?: Partial<
    Pick<
      AssetManagerItemActions,
      "createFolder" | "upload" | "deleteUnusedAssets"
    >
  >;
};

const AssetGrid = ({
  children,
  ...props
}: { children: ReactNode } & Omit<ComponentProps<typeof Grid>, "children">) => (
  <Grid
    {...props}
    columns={3}
    gap="2"
    css={{
      minHeight: "100%",
      alignContent: "start",
      paddingInline: theme.panel.paddingInline,
    }}
  >
    {children}
  </Grid>
);

const getItemCountLabel = (count: number, qualifier?: string) =>
  `${count} ${qualifier === undefined ? "" : `${qualifier} `}${
    count === 1 ? "item" : "items"
  }`;

export const AssetManager = ({
  accept = "*",
  onChange,
  folderId,
  onFolderChange,
  canManageFolders = false,
  panelActions,
}: AssetManagerProps) => {
  const { assetContainers } = useAssets();
  const folders = useStore($assetFolders);
  const project = useStore($project);
  const authPermit = useStore($authPermit);
  const clipboard = useStore($assetManagerClipboard);
  const folderHierarchy = useMemo(
    () => createAssetFolderHierarchy(folders),
    [folders]
  );
  const mimePatterns = useMemo(() => acceptToMimePatterns(accept), [accept]);
  const [internalFolderId, setInternalFolderId] = useState(folderId);
  const [selection, setSelection] = useState<AssetManagerSelection>();
  const [forcedSelection, setForcedSelection] =
    useState<AssetManagerSelection[]>();
  const [selectionAnchor, setSelectionAnchor] =
    useState<AssetManagerSelection>();
  const [pendingDeleteItems, setPendingDeleteItems] =
    useState<AssetManagerSelection[]>();
  const [pendingMoveItems, setPendingMoveItems] =
    useState<AssetManagerSelection[]>();
  const [announcement, setAnnouncement] = useState("");
  const [marqueeRect, setMarqueeRect] = useState<AssetManagerMarqueeRect>();
  const [itemContextMenu, setItemContextMenu] = useState<{
    actions?: AssetManagerItemActions;
    instance: number;
  }>({ instance: 0 });
  const itemElements = useRef(new Map<string, HTMLElement>());
  const panelElement = useRef<HTMLDivElement | null>(null);
  const backElement = useRef<HTMLElement | null>(null);
  const cleanupMarquee = useRef<() => void>();
  const pendingFocus = useRef<"back" | AssetManagerSelection>();
  const clearMultiselect = useCallback(() => {
    setForcedSelection(undefined);
    setSelectionAnchor(undefined);
  }, []);
  const clearSelection = useCallback(() => {
    setSelection(undefined);
    clearMultiselect();
  }, [clearMultiselect]);
  const currentFolderId =
    onFolderChange === undefined ? internalFolderId : folderId;
  const setCurrentFolderId = useCallback(
    (nextFolderId: string | undefined) => {
      if (onFolderChange === undefined) {
        setInternalFolderId(nextFolderId);
      } else {
        onFolderChange(nextFolderId);
      }
      clearSelection();
      setAnnouncement(
        nextFolderId === undefined
          ? "Opened Root."
          : `Opened folder ${folders.get(nextFolderId)?.name ?? "folder"}.`
      );
    },
    [clearSelection, folders, onFolderChange]
  );

  useEffect(() => {
    if (
      currentFolderId !== undefined &&
      folders.has(currentFolderId) === false
    ) {
      setCurrentFolderId(undefined);
    }
  }, [currentFolderId, folders, setCurrentFolderId]);

  // Only show assets that match the accept constraint so incompatible types
  // (e.g. video files) can never be selected from an image picker.
  const compatibleContainers = useMemo(() => {
    if (mimePatterns === "*") {
      return assetContainers;
    }
    return assetContainers.filter((container) =>
      doesAssetMatchMimePatterns(container.asset, mimePatterns)
    );
  }, [assetContainers, mimePatterns]);

  const [selectedExtensions, setSelectedExtensions] = useState<
    AllowedFileExtension[] | "*"
  >(() => getInitialExtensions(accept, compatibleContainers));

  const [sortState, setSortState] = useState<SortState>({
    sortBy: "createdAt",
    order: "desc",
  });

  const formatCounts = useMemo(
    () => calculateFormatCounts(compatibleContainers),
    [compatibleContainers]
  );

  const searchProps = useSearchFieldKeys({
    onMove({ direction }) {
      const selectedIndex = getAssetManagerSelectionIndex(
        navigableItems,
        selection
      );
      if (direction === "current") {
        const selectedItem = navigableItems[selectedIndex];
        if (selectedItem?.type === "folder") {
          pendingFocus.current = "back";
          setCurrentFolderId(selectedItem.id);
          return;
        }
        const assetContainer = filteredItems.find(
          ({ asset }) => asset.id === selectedItem?.id
        );
        if (assetContainer?.status === "uploaded") {
          onChange?.(assetContainer.asset.id);
        }
        return;
      }
      const nextIndex = findNextListItemIndex(
        selectedIndex,
        navigableItems.length,
        direction
      );
      setSelection(navigableItems[nextIndex]);
      clearMultiselect();
    },
  });
  const searchQuery = searchProps.value.trim();
  const isSearching = searchQuery.length > 0;

  const filteredItems = useMemo(() => {
    const descendantIds = folderHierarchy.getDescendantIds(currentFolderId);
    const scopedContainers = compatibleContainers.filter(({ asset }) => {
      const folderId = folderHierarchy.resolveFolderId(asset.folderId);
      if (isSearching) {
        return (
          currentFolderId === undefined ||
          folderId === currentFolderId ||
          (folderId !== undefined && descendantIds.has(folderId))
        );
      }
      return folderId === currentFolderId;
    });
    return filterAndSortAssets({
      assetContainers: scopedContainers,
      selectedExtensions,
      searchQuery,
      sortState,
    });
  }, [
    compatibleContainers,
    currentFolderId,
    folderHierarchy,
    selectedExtensions,
    isSearching,
    searchQuery,
    sortState,
  ]);

  const uploadedCompatibleAssets = useMemo(
    () =>
      compatibleContainers.flatMap((container) =>
        container.status === "uploaded" ? [container.asset] : []
      ),
    [compatibleContainers]
  );

  const visibleFolders = useMemo(() => {
    const matchingFolders = filterAssetFolders({
      folders,
      hierarchy: folderHierarchy,
      currentFolderId,
      searchQuery,
      compatibleAssets: uploadedCompatibleAssets,
      hideEmptyFolders: mimePatterns !== "*",
    });
    return sortAssetFolders({
      folders: matchingFolders,
      hierarchy: folderHierarchy,
      assets: uploadedCompatibleAssets,
      sortState,
    });
  }, [
    currentFolderId,
    folders,
    folderHierarchy,
    mimePatterns,
    searchQuery,
    sortState,
    uploadedCompatibleAssets,
  ]);

  const navigableItems: AssetManagerSelection[] = useMemo(
    () => [
      ...visibleFolders.map(({ id }) => ({ type: "folder" as const, id })),
      ...filteredItems.map(({ asset }) => ({
        type: "asset" as const,
        id: asset.id,
      })),
    ],
    [filteredItems, visibleFolders]
  );

  const previousNavigableItems = useRef(navigableItems);
  useLayoutEffect(() => {
    if (
      forcedSelection?.some(
        (item) =>
          isAssetManagerSelectionVisible(
            item,
            filteredItems,
            visibleFolders
          ) === false
      )
    ) {
      clearMultiselect();
    }
    if (
      isAssetManagerSelectionVisible(
        selection,
        filteredItems,
        visibleFolders
      ) === false
    ) {
      const nextSelection = getNearestAssetManagerSelection(
        previousNavigableItems.current,
        navigableItems,
        selection
      );
      setSelection(nextSelection);
      if (nextSelection !== undefined) {
        window.requestAnimationFrame(() => {
          if (document.activeElement === document.body) {
            itemElements.current
              .get(getAssetManagerSelectionKey(nextSelection))
              ?.focus();
          }
        });
      }
    }
    previousNavigableItems.current = navigableItems;
  }, [
    clearMultiselect,
    filteredItems,
    forcedSelection,
    navigableItems,
    selection,
    visibleFolders,
  ]);

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = undefined;
    if (target === "back") {
      backElement.current?.focus();
    } else if (target !== undefined) {
      itemElements.current.get(getAssetManagerSelectionKey(target))?.focus();
    }
  }, [currentFolderId]);

  const registerItemElement = (
    item: AssetManagerSelection,
    element: HTMLElement | null
  ) => {
    const key = getAssetManagerSelectionKey(item);
    if (element === null) {
      itemElements.current.delete(key);
    } else {
      itemElements.current.set(key, element);
    }
  };

  const openFolder = (folderId: string) => {
    pendingFocus.current = "back";
    setCurrentFolderId(folderId);
  };

  const handleFocusChange = (item: AssetManagerSelection, focused: boolean) => {
    if (focused) {
      setSelection(item);
    } else if (
      forcedSelection === undefined &&
      isSameAssetManagerSelection(selection, item)
    ) {
      setSelection(undefined);
    }
  };

  const announceSelection = (items: readonly AssetManagerSelection[]) =>
    setAnnouncement(`${getItemCountLabel(items.length)} selected.`);

  const exitMultiselect = () => {
    if (forcedSelection === undefined) {
      return;
    }
    clearMultiselect();
    setAnnouncement("Multiselect ended.");
  };

  const handleItemPointerDown = (
    item: AssetManagerSelection,
    event: ReactPointerEvent<HTMLElement>
  ) => {
    if (canManageFolders === false || event.button !== 0) {
      return;
    }
    const hasToggleModifier = event.metaKey || event.ctrlKey;
    if (event.shiftKey === false && hasToggleModifier === false) {
      if (
        forcedSelection !== undefined &&
        includesAssetManagerSelection(forcedSelection, item)
      ) {
        return;
      }
      exitMultiselect();
      setSelection(item);
      return;
    }
    const anchor = selectionAnchor ?? selection;
    if (
      anchor === undefined ||
      (forcedSelection === undefined &&
        isSameAssetManagerSelection(anchor, item))
    ) {
      return;
    }
    const nextSelection = event.shiftKey
      ? getAssetManagerSelectionRange(navigableItems, anchor, item)
      : toggleAssetManagerSelection(forcedSelection ?? [anchor], item);
    setForcedSelection(nextSelection);
    setSelectionAnchor(anchor);
    announceSelection(nextSelection);
  };

  const handleItemClick = (
    item: AssetManagerSelection,
    event: MouseEvent<HTMLElement>
  ) => {
    if (
      forcedSelection === undefined ||
      event.shiftKey ||
      event.metaKey ||
      event.ctrlKey ||
      includesAssetManagerSelection(forcedSelection, item) === false
    ) {
      return;
    }
    exitMultiselect();
    setSelection(item);
  };

  const handleModifiedArrow = (
    item: AssetManagerSelection,
    event: KeyboardEvent<HTMLElement>
  ) => {
    if (canManageFolders === false) {
      return;
    }
    const nextItem = getAdjacentAssetManagerSelection({
      items: navigableItems,
      current: item,
      direction:
        event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? "previous"
          : "next",
    });
    if (nextItem === undefined) {
      return;
    }
    event.preventDefault();
    const anchor = selectionAnchor ?? item;
    const nextSelection = event.shiftKey
      ? getAssetManagerSelectionRange(navigableItems, anchor, nextItem)
      : addAssetManagerSelection(forcedSelection ?? [item], nextItem);
    setForcedSelection(nextSelection);
    setSelectionAnchor(anchor);
    setSelection(nextItem);
    announceSelection(nextSelection);
    itemElements.current.get(getAssetManagerSelectionKey(nextItem))?.focus();
  };

  const handleContextMenuSelection = (item: AssetManagerSelection) => {
    if (
      forcedSelection !== undefined &&
      includesAssetManagerSelection(forcedSelection, item)
    ) {
      return;
    }
    clearMultiselect();
    setSelection(item);
  };

  const isItemSelected = (item: AssetManagerSelection) =>
    forcedSelection === undefined
      ? isSameAssetManagerSelection(selection, item)
      : includesAssetManagerSelection(forcedSelection, item);

  const getFolderName = useCallback(
    (folderId: string | undefined) =>
      folderId === undefined
        ? "Root"
        : (folders.get(folderId)?.name ?? "folder"),
    [folders]
  );

  const assetsById = useMemo(
    () =>
      new Map(
        assetContainers.flatMap((container) =>
          container.status === "uploaded"
            ? [[container.asset.id, container.asset] as const]
            : []
        )
      ),
    [assetContainers]
  );

  const normalizeItems = useCallback(
    (items: readonly AssetManagerSelection[]) =>
      normalizeAssetManagerItems({
        items,
        folders,
        assets: assetsById,
      }),
    [assetsById, folders]
  );

  const normalizedSelection = useMemo(
    () =>
      normalizeItems(
        forcedSelection ?? (selection === undefined ? [] : [selection])
      ),
    [forcedSelection, normalizeItems, selection]
  );
  const normalizedShortcutSelection = normalizedSelection.filter(
    (item) => item.type === "asset" || canManageFolders
  );
  const shortcutItems =
    project === undefined || authPermit === "view"
      ? []
      : normalizedShortcutSelection.map((item) => ({
          ...item,
          projectId: project.id,
        }));
  const copyItems = (items: readonly AssetManagerItem[]) => {
    copyAssetManagerItems(items);
    setAnnouncement(`${getItemCountLabel(items.length)} copied.`);
  };
  const cutItems = (items: readonly AssetManagerItem[]) => {
    cutAssetManagerItems(items);
    setAnnouncement(`${getItemCountLabel(items.length)} cut.`);
  };
  const duplicateItems = (items: readonly AssetManagerItem[]) => {
    duplicateAssetManagerItems(items);
    setAnnouncement(`${getItemCountLabel(items.length)} duplicated.`);
  };
  const selectionActions: AssetManagerItemActions =
    forcedSelection === undefined || shortcutItems.length === 0
      ? {}
      : {
          cut: () => cutItems(shortcutItems),
          copy: () => copyItems(shortcutItems),
          duplicate: () => duplicateItems(shortcutItems),
          move: () => setPendingMoveItems(normalizedShortcutSelection),
          delete: () => setPendingDeleteItems(normalizedShortcutSelection),
        };

  const moveItems = useCallback(
    (items: readonly AssetManagerSelection[], parentId: string | undefined) => {
      const normalizedItems = normalizeItems(items);
      moveAssetManagerItems(normalizedItems, parentId);
      clearMultiselect();
      setAnnouncement(
        `${getItemCountLabel(normalizedItems.length)} moved to ${getFolderName(
          parentId
        )}.`
      );
    },
    [clearMultiselect, getFolderName, normalizeItems]
  );
  const canMoveItems = useCallback(
    (
      items: readonly AssetManagerSelection[],
      targetFolderId: string | undefined
    ) =>
      canMoveAssetManagerItems({
        items,
        targetFolderId,
        hierarchy: folderHierarchy,
      }),
    [folderHierarchy]
  );
  const moveExcludedFolderIds = useMemo(() => {
    if (pendingMoveItems === undefined) {
      return;
    }
    return new Set(
      pendingMoveItems.flatMap((item) =>
        item.type === "folder" ? [item.id] : []
      )
    );
  }, [pendingMoveItems]);

  useEffect(() => {
    const element = panelElement.current;
    if (element === null || canManageFolders === false) {
      return;
    }
    return dropTargetForElements({
      element,
      canDrop: ({ source }) => {
        const items = getAssetManagerDragItems(source.data);
        return canMoveItems(items, currentFolderId);
      },
      onDrop: ({ source, location }) => {
        if (location.current.dropTargets[0]?.element !== element) {
          return;
        }
        const items = getAssetManagerDragItems(source.data);
        if (items.length > 0) {
          moveItems(items, currentFolderId);
        }
      },
    });
  }, [canManageFolders, canMoveItems, currentFolderId, moveItems]);

  const getDragItems = useCallback(
    (item: AssetManagerSelection) =>
      forcedSelection !== undefined &&
      includesAssetManagerSelection(forcedSelection, item)
        ? forcedSelection
        : [item],
    [forcedSelection]
  );

  const backCard =
    currentFolderId === undefined ? undefined : (
      <BackThumbnail
        onElementChange={(element) => {
          backElement.current = element;
        }}
        onOpen={() => {
          pendingFocus.current = { type: "folder", id: currentFolderId };
          setCurrentFolderId(folders.get(currentFolderId)?.parentId);
        }}
      />
    );

  const panelContextMenuActions: AssetManagerItemActions = {
    ...panelActions,
    ...(canManageFolders
      ? { paste: () => pasteAssetManagerClipboard(currentFolderId) }
      : {}),
  };
  const canPaste =
    canManageFolders && canPasteAssetManagerClipboard(currentFolderId);
  const disabledPanelActions = new Set<keyof AssetManagerItemActions>();
  if (canPaste === false) {
    disabledPanelActions.add("paste");
  }
  const handleShortcut = (event: KeyboardEvent<HTMLElement>) => {
    if (panelElement.current?.contains(event.target as Node) === false) {
      return;
    }
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.matches("input, textarea, select") ||
        target.isContentEditable ||
        target.closest("[contenteditable]") !== null)
    ) {
      return;
    }
    const key = event.key.toLowerCase();
    const hasCommandModifier = event.metaKey || event.ctrlKey;
    const isItemCommand =
      hasCommandModifier &&
      event.altKey === false &&
      event.shiftKey === false &&
      ["c", "x", "v", "d"].includes(key);
    const isDeleteCommand =
      hasCommandModifier === false &&
      event.altKey === false &&
      event.shiftKey === false &&
      ["backspace", "delete"].includes(key);
    if (isItemCommand === false && isDeleteCommand === false) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    if (key === "c" && shortcutItems.length > 0) {
      copyItems(shortcutItems);
    } else if (key === "x" && shortcutItems.length > 0) {
      cutItems(shortcutItems);
    } else if (key === "d" && shortcutItems.length > 0) {
      duplicateItems(shortcutItems);
    } else if (key === "v" && canPaste) {
      const pastedItemCount = clipboard?.items.length ?? 0;
      pasteAssetManagerClipboard(currentFolderId);
      setAnnouncement(
        `${getItemCountLabel(pastedItemCount)} pasted into ${getFolderName(
          currentFolderId
        )}.`
      );
    } else if (isDeleteCommand && shortcutItems.length > 0) {
      setPendingDeleteItems(normalizedShortcutSelection);
    }
  };
  const hasPanelContextMenuActions = Object.values(
    panelContextMenuActions
  ).some((action) => action !== undefined);
  const showItemContextMenu = (actions: AssetManagerItemActions) => {
    flushSync(() => {
      setItemContextMenu(({ instance }) => ({
        actions,
        instance: instance + 1,
      }));
    });
  };
  const thumbnailInteractions: AssetManagerThumbnailInteractions = {
    onSelectionChange: handleFocusChange,
    onItemPointerDown: handleItemPointerDown,
    onItemClick: handleItemClick,
    onModifiedArrow: handleModifiedArrow,
    onExitMultiselect:
      forcedSelection === undefined ? undefined : exitMultiselect,
    onContextMenuSelection: handleContextMenuSelection,
    onContextMenuActions: showItemContextMenu,
    getDragItems,
  };

  useEffect(() => () => cleanupMarquee.current?.(), []);

  const handlePanelPointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    listViewport: HTMLElement | null
  ) => {
    if (
      canManageFolders === false ||
      event.button !== 0 ||
      event.pointerType === "touch" ||
      event.target instanceof Element === false ||
      event.target.closest("[data-asset-manager-thumbnail]") !== null
    ) {
      return;
    }

    if (listViewport?.contains(event.target) !== true) {
      setSelection(undefined);
      exitMultiselect();
      return;
    }

    const listbox = listViewport.querySelector<HTMLElement>('[role="listbox"]');
    if (listbox === null) {
      return;
    }

    cleanupMarquee.current?.();
    const panel = panelElement.current;
    if (panel === null) {
      return;
    }

    const hasAddModifier = event.shiftKey || event.metaKey || event.ctrlKey;
    const initialSelection = hasAddModifier
      ? (forcedSelection ?? (selection === undefined ? [] : [selection]))
      : [];
    if (hasAddModifier === false) {
      clearSelection();
    }

    cleanupMarquee.current = startAssetManagerMarquee({
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      panel,
      listbox,
      items: navigableItems,
      initialSelection,
      getItemElement: (item) =>
        itemElements.current.get(getAssetManagerSelectionKey(item)),
      onSelectionChange: setForcedSelection,
      onRectChange: setMarqueeRect,
      onFinish: (items, active) => {
        cleanupMarquee.current = undefined;
        if (active === false) {
          return;
        }
        if (items.length === 0) {
          clearSelection();
          announceSelection([]);
          return;
        }
        const focusedItem = items[0];
        setForcedSelection(items);
        setSelectionAnchor(focusedItem);
        setSelection(focusedItem);
        announceSelection(items);
        itemElements.current
          .get(getAssetManagerSelectionKey(focusedItem))
          ?.focus({ preventScroll: true });
      },
      onCancel: () => {
        cleanupMarquee.current = undefined;
        setForcedSelection(
          initialSelection.length === 0 ? undefined : [...initialSelection]
        );
      },
    });
  };

  return (
    <>
      <AssetsShell
        filters={
          <Flex gap="2" grow>
            <AssetFilters
              formatCounts={formatCounts}
              value={selectedExtensions}
              onChange={setSelectedExtensions}
            />
            <AssetSortSelect value={sortState} onValueChange={setSortState} />
          </Flex>
        }
        searchProps={searchProps}
        isEmpty={filteredItems.length === 0 && visibleFolders.length === 0}
        emptyMessage={isSearching ? "No matching assets or folders" : undefined}
        emptyContent={
          backCard === undefined ? undefined : (
            <AssetGrid role="listbox" aria-multiselectable={canManageFolders}>
              {backCard}
            </AssetGrid>
          )
        }
        interactionOverlay={
          marqueeRect === undefined ? undefined : (
            <Box
              data-asset-manager-marquee=""
              css={{
                position: "absolute",
                left: marqueeRect.left,
                top: marqueeRect.top,
                width: marqueeRect.width,
                height: marqueeRect.height,
                pointerEvents: "none",
                backgroundColor: `color-mix(in srgb, ${theme.colors.backgroundPrimary} 12%, transparent)`,
                border: `1px solid ${theme.colors.borderFocus}`,
                zIndex: 1,
              }}
            />
          )
        }
        type="file"
        accept={accept}
        folderId={currentFolderId}
        onElementChange={(element) => {
          panelElement.current = element;
        }}
        onPointerDown={handlePanelPointerDown}
        onContextMenu={(event) => {
          if (
            event.target instanceof Element === false ||
            event.target.closest("[data-asset-manager-thumbnail]") === null
          ) {
            flushSync(() => {
              setItemContextMenu(({ instance }) => ({
                instance: instance + 1,
              }));
            });
          }
        }}
        onKeyDown={handleShortcut}
        autoScrollOnElementDrag={canManageFolders}
        contextMenu={
          hasPanelContextMenuActions ? (
            <AssetManagerItemContextMenuContent
              key={itemContextMenu.instance}
              actions={itemContextMenu.actions ?? panelContextMenuActions}
              disabledActions={
                itemContextMenu.actions === undefined
                  ? disabledPanelActions
                  : undefined
              }
            />
          ) : undefined
        }
        footer={
          <AssetFolderBreadcrumbs
            hierarchy={folderHierarchy}
            folderId={currentFolderId}
            onChange={setCurrentFolderId}
            canPaste={
              canManageFolders ? canPasteAssetManagerClipboard : undefined
            }
            onPaste={canManageFolders ? pasteAssetManagerClipboard : undefined}
          />
        }
      >
        <>
          <Box
            role="status"
            aria-live="polite"
            css={{
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
            }}
          >
            {announcement}
          </Box>
          <AssetGrid role="listbox" aria-multiselectable={canManageFolders}>
            <>
              {backCard}
              {visibleFolders.map((folder) => (
                <FolderThumbnail
                  key={folder.id}
                  folder={folder}
                  interactions={thumbnailInteractions}
                  selected={isItemSelected({ type: "folder", id: folder.id })}
                  forcedSelection={forcedSelection !== undefined}
                  selectionActions={
                    forcedSelection === undefined ? undefined : selectionActions
                  }
                  canManage={canManageFolders}
                  canMoveItems={canMoveItems}
                  onOpen={() => openFolder(folder.id)}
                  path={
                    isSearching
                      ? formatAssetFolderPath(folderHierarchy, folder.parentId)
                      : undefined
                  }
                  onElementChange={(element) =>
                    registerItemElement(
                      { type: "folder", id: folder.id },
                      element
                    )
                  }
                  onMoveItems={moveItems}
                  onMove={() =>
                    setPendingMoveItems([{ type: "folder", id: folder.id }])
                  }
                />
              ))}
              {filteredItems.map((assetContainer) => (
                <AssetThumbnail
                  key={assetContainer.asset.id}
                  assetContainer={assetContainer}
                  interactions={thumbnailInteractions}
                  selectionActions={
                    forcedSelection === undefined ? undefined : selectionActions
                  }
                  onChange={(assetContainer) => {
                    onChange?.(assetContainer.asset.id);
                  }}
                  selected={isItemSelected({
                    type: "asset",
                    id: assetContainer.asset.id,
                  })}
                  forcedSelection={forcedSelection !== undefined}
                  folderPath={
                    isSearching
                      ? formatAssetFolderPath(
                          folderHierarchy,
                          assetContainer.asset.folderId
                        )
                      : undefined
                  }
                  canDrag={canManageFolders}
                  onMove={() =>
                    setPendingMoveItems([
                      { type: "asset", id: assetContainer.asset.id },
                    ])
                  }
                  onElementChange={(element) =>
                    registerItemElement(
                      { type: "asset", id: assetContainer.asset.id },
                      element
                    )
                  }
                />
              ))}
            </>
          </AssetGrid>
        </>
      </AssetsShell>
      <Dialog
        open={pendingDeleteItems !== undefined}
        onOpenChange={(open) => {
          if (open === false) {
            setPendingDeleteItems(undefined);
          }
        }}
      >
        <DialogContent minWidth={360} aria-describedby={undefined}>
          <DialogTitle>Delete selected items</DialogTitle>
          <Box css={{ padding: theme.panel.padding }}>
            <Text>
              Delete{" "}
              {getItemCountLabel(pendingDeleteItems?.length ?? 0, "selected")}?
              Everything inside selected folders will also be deleted.
            </Text>
            <Flex justify="end" css={{ marginTop: theme.panel.paddingBlock }}>
              <Button
                autoFocus
                color="destructive"
                prefix={<TrashIcon />}
                onClick={() => {
                  const items = pendingDeleteItems ?? [];
                  deleteAssetManagerItems(items);
                  setPendingDeleteItems(undefined);
                  clearMultiselect();
                  setAnnouncement(
                    `${getItemCountLabel(items.length)} deleted.`
                  );
                }}
              >
                Delete
              </Button>
            </Flex>
          </Box>
        </DialogContent>
      </Dialog>
      {pendingMoveItems !== undefined && (
        <MoveAssetManagerItemsDialog
          initialFolderId={currentFolderId}
          excludedFolderIds={moveExcludedFolderIds}
          canMove={(folderId) => canMoveItems(pendingMoveItems, folderId)}
          onMove={(folderId) => moveItems(pendingMoveItems, folderId)}
          onClose={() => setPendingMoveItems(undefined)}
        />
      )}
    </>
  );
};
