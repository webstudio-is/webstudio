import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { useStore } from "@nanostores/react";
import {
  Box,
  Flex,
  Grid,
  findNextListItemIndex,
  theme,
  useSearchFieldKeys,
} from "@webstudio-is/design-system";
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
import { moveAssetFolder, moveAssetToFolder } from "./asset-folder-actions";
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
  pasteAssetManagerItem,
} from "./asset-manager-clipboard";
import {
  AssetManagerItemContextMenuContent,
  type AssetManagerItemActions,
} from "./asset-manager-item-menu";

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

const AssetGrid = ({ children }: { children: ReactNode }) => (
  <Grid columns={3} gap="2" css={{ paddingInline: theme.panel.paddingInline }}>
    {children}
  </Grid>
);

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
  const clipboard = useStore($assetManagerClipboard);
  const folderHierarchy = useMemo(
    () => createAssetFolderHierarchy(folders),
    [folders]
  );
  const mimePatterns = useMemo(() => acceptToMimePatterns(accept), [accept]);
  const [internalFolderId, setInternalFolderId] = useState(folderId);
  const [selection, setSelection] = useState<AssetManagerSelection>();
  const [announcement, setAnnouncement] = useState("");
  const itemElements = useRef(new Map<string, HTMLElement>());
  const backElement = useRef<HTMLElement | null>(null);
  const pendingFocus = useRef<"back" | AssetManagerSelection>();
  const currentFolderId =
    onFolderChange === undefined ? internalFolderId : folderId;
  const setCurrentFolderId = useCallback(
    (nextFolderId: string | undefined) => {
      if (onFolderChange === undefined) {
        setInternalFolderId(nextFolderId);
      } else {
        onFolderChange(nextFolderId);
      }
      setSelection(undefined);
      setAnnouncement(
        nextFolderId === undefined
          ? "Opened Root."
          : `Opened folder ${folders.get(nextFolderId)?.name ?? "folder"}.`
      );
    },
    [folders, onFolderChange]
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
              .get(`${nextSelection.type}:${nextSelection.id}`)
              ?.focus();
          }
        });
      }
    }
    previousNavigableItems.current = navigableItems;
  }, [filteredItems, navigableItems, selection, visibleFolders]);

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = undefined;
    if (target === "back") {
      backElement.current?.focus();
    } else if (target !== undefined) {
      itemElements.current.get(`${target.type}:${target.id}`)?.focus();
    }
  }, [currentFolderId]);

  const registerItemElement = (
    item: AssetManagerSelection,
    element: HTMLElement | null
  ) => {
    const key = `${item.type}:${item.id}`;
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

  const handleSelectionChange = (
    item: AssetManagerSelection,
    selected: boolean
  ) => {
    setSelection(selected ? item : undefined);
  };

  const getFolderName = (folderId: string | undefined) =>
    folderId === undefined
      ? "No folder"
      : (folders.get(folderId)?.name ?? "folder");

  const moveAsset = (assetId: string, nextFolderId: string | undefined) => {
    if (moveAssetToFolder(assetId, nextFolderId) === undefined) {
      return;
    }
    const assetName = assetContainers.find(({ asset }) => asset.id === assetId)
      ?.asset.name;
    setAnnouncement(
      `${assetName ?? "Asset"} moved to ${getFolderName(nextFolderId)}.`
    );
  };

  const moveFolder = (movedFolderId: string, parentId: string | undefined) => {
    const result = moveAssetFolder(movedFolderId, parentId);
    if (result === undefined) {
      return;
    }
    setAnnouncement(
      `${folders.get(movedFolderId)?.name ?? "Folder"} moved to ${getFolderName(parentId)}.`
    );
  };

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
      ? { paste: () => pasteAssetManagerItem(currentFolderId) }
      : {}),
  };
  const disabledPanelActions = new Set<keyof AssetManagerItemActions>();
  if (clipboard === undefined || clipboard.projectId !== project?.id) {
    disabledPanelActions.add("paste");
  }
  const canPaste =
    canManageFolders &&
    clipboard !== undefined &&
    clipboard.projectId === project?.id;
  const hasPanelContextMenuActions = Object.values(
    panelContextMenuActions
  ).some((action) => action !== undefined);

  return (
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
        backCard === undefined ? undefined : <AssetGrid>{backCard}</AssetGrid>
      }
      type="file"
      accept={accept}
      folderId={currentFolderId}
      contextMenu={
        hasPanelContextMenuActions ? (
          <AssetManagerItemContextMenuContent
            actions={panelContextMenuActions}
            disabledActions={disabledPanelActions}
          />
        ) : undefined
      }
      footer={
        <AssetFolderBreadcrumbs
          hierarchy={folderHierarchy}
          folderId={currentFolderId}
          onChange={setCurrentFolderId}
          onPaste={canPaste ? pasteAssetManagerItem : undefined}
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
        <AssetGrid>
          <>
            {backCard}
            {visibleFolders.map((folder) => (
              <FolderThumbnail
                key={folder.id}
                folder={folder}
                selected={
                  selection?.type === "folder" && selection.id === folder.id
                }
                onSelectionChange={(selected) =>
                  handleSelectionChange(
                    { type: "folder", id: folder.id },
                    selected
                  )
                }
                canManage={canManageFolders}
                canMoveFolder={(movedFolderId) =>
                  folderHierarchy
                    .getSubtreeIds(movedFolderId)
                    .has(folder.id) === false
                }
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
                onMoveAsset={(assetId) => moveAsset(assetId, folder.id)}
                onMoveFolder={(folderId) => moveFolder(folderId, folder.id)}
              />
            ))}
            {filteredItems.map((assetContainer) => (
              <AssetThumbnail
                key={assetContainer.asset.id}
                assetContainer={assetContainer}
                onSelectionChange={(selected) =>
                  handleSelectionChange(
                    { type: "asset", id: assetContainer.asset.id },
                    selected
                  )
                }
                onChange={(assetContainer) => {
                  onChange?.(assetContainer.asset.id);
                }}
                selected={
                  selection?.type === "asset" &&
                  selection.id === assetContainer.asset.id
                }
                folderPath={
                  isSearching
                    ? formatAssetFolderPath(
                        folderHierarchy,
                        assetContainer.asset.folderId
                      )
                    : undefined
                }
                canDrag={canManageFolders}
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
  );
};
