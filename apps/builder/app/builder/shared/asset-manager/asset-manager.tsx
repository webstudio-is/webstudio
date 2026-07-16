import {
  useCallback,
  useEffect,
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
import { AssetsShell, type AssetContainer, useAssets } from "../assets";
import { AssetThumbnail } from "./asset-thumbnail";
import { BackThumbnail, FolderThumbnail } from "./asset-folder-thumbnail";
import { AssetFilters } from "./asset-filters";
import { AssetSortSelect } from "./asset-sort";
import { $assetFolders } from "~/shared/sync/data-stores";
import { AssetFolderBreadcrumbs } from "./asset-folder-breadcrumbs";
import { formatAssetFolderPath, sortAssetFolders } from "./asset-folder-utils";
import { moveAssetFolder, moveAssetToFolder } from "./asset-folder-actions";
import {
  getInitialExtensions,
  calculateFormatCounts,
  filterAndSortAssets,
  getAssetManagerSelectionIndex,
  isAssetManagerSelectionVisible,
  type AssetManagerSelection,
  type SortState,
} from "./utils";

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
}: AssetManagerProps) => {
  const { assetContainers } = useAssets();
  const folders = useStore($assetFolders);
  const folderHierarchy = useMemo(
    () => createAssetFolderHierarchy(folders),
    [folders]
  );
  const [internalFolderId, setInternalFolderId] = useState(folderId);
  const [selection, setSelection] = useState<AssetManagerSelection>();
  const [announcement, setAnnouncement] = useState("");
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
    },
    [onFolderChange]
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
    const patterns = acceptToMimePatterns(accept);
    if (patterns === "*") {
      return assetContainers;
    }
    return assetContainers.filter((container) =>
      doesAssetMatchMimePatterns(container.asset, patterns)
    );
  }, [accept, assetContainers]);

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

  const filteredItems = useMemo(() => {
    const descendantIds = folderHierarchy.getDescendantIds(currentFolderId);
    const scopedContainers = compatibleContainers.filter(({ asset }) => {
      const folderId = folderHierarchy.resolveFolderId(asset.folderId);
      if (searchProps.value.length > 0) {
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
      searchQuery: searchProps.value,
      sortState,
    });
  }, [
    compatibleContainers,
    currentFolderId,
    folderHierarchy,
    selectedExtensions,
    searchProps.value,
    sortState,
  ]);

  const visibleFolders = useMemo(() => {
    const normalizedSearch = searchProps.value.trim().toLocaleLowerCase();
    const directFolders = folderHierarchy
      .getChildren(currentFolderId)
      .filter(
        (folder) =>
          normalizedSearch === "" ||
          folder.name.toLocaleLowerCase().includes(normalizedSearch)
      );
    return sortAssetFolders({
      folders: directFolders,
      hierarchy: folderHierarchy,
      assets: compatibleContainers.flatMap((container) =>
        container.status === "uploaded" ? [container.asset] : []
      ),
      sortState,
    });
  }, [
    compatibleContainers,
    currentFolderId,
    folderHierarchy,
    searchProps.value,
    sortState,
  ]);

  const navigableItems: AssetManagerSelection[] = [
    ...visibleFolders.map(({ id }) => ({ type: "folder" as const, id })),
    ...filteredItems.map(({ asset }) => ({
      type: "asset" as const,
      id: asset.id,
    })),
  ];

  useEffect(() => {
    if (
      isAssetManagerSelectionVisible(
        selection,
        filteredItems,
        visibleFolders
      ) === false
    ) {
      setSelection(undefined);
    }
  }, [filteredItems, selection, visibleFolders]);

  const handleSelect = (assetContainer?: AssetContainer) => {
    setSelection(
      assetContainer === undefined
        ? undefined
        : { type: "asset", id: assetContainer.asset.id }
    );
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
        onOpen={() =>
          setCurrentFolderId(folders.get(currentFolderId)?.parentId)
        }
      />
    );

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
      emptyMessage={
        searchProps.value.length > 0 ? "No matching assets" : undefined
      }
      emptyContent={
        backCard === undefined ? undefined : <AssetGrid>{backCard}</AssetGrid>
      }
      type="file"
      accept={accept}
      folderId={currentFolderId}
      footer={
        <AssetFolderBreadcrumbs
          hierarchy={folderHierarchy}
          folderId={currentFolderId}
          onChange={setCurrentFolderId}
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
          {backCard}
          {visibleFolders.map((folder) => (
            <FolderThumbnail
              key={folder.id}
              folder={folder}
              selected={
                selection?.type === "folder" && selection.id === folder.id
              }
              onSelect={() => setSelection({ type: "folder", id: folder.id })}
              canManage={canManageFolders}
              canMoveFolder={(movedFolderId) =>
                movedFolderId !== folder.id &&
                folderHierarchy
                  .getDescendantIds(movedFolderId)
                  .has(folder.id) === false
              }
              onOpen={() => setCurrentFolderId(folder.id)}
              onMoveAsset={(assetId) => moveAsset(assetId, folder.id)}
              onMoveFolder={(folderId) => moveFolder(folderId, folder.id)}
            />
          ))}
          {filteredItems.map((assetContainer) => (
            <AssetThumbnail
              key={assetContainer.asset.id}
              assetContainer={assetContainer}
              onSelect={handleSelect}
              onChange={(assetContainer) => {
                onChange?.(assetContainer.asset.id);
              }}
              selected={
                selection?.type === "asset" &&
                selection.id === assetContainer.asset.id
              }
              folderPath={
                searchProps.value.length > 0
                  ? formatAssetFolderPath(
                      folderHierarchy,
                      assetContainer.asset.folderId
                    )
                  : undefined
              }
              canDrag={canManageFolders}
            />
          ))}
        </AssetGrid>
      </>
    </AssetsShell>
  );
};
