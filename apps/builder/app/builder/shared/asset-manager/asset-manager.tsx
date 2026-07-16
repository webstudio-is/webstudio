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
  doesAssetMatchMimePatterns,
  getAssetFolderDescendantIds,
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
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { moveAssetToFolder } from "./asset-folder-actions";
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
    const descendantIds = getAssetFolderDescendantIds(folders, currentFolderId);
    const scopedContainers = compatibleContainers.filter(({ asset }) => {
      if (searchProps.value.length > 0) {
        return (
          currentFolderId === undefined ||
          asset.folderId === currentFolderId ||
          (asset.folderId !== undefined && descendantIds.has(asset.folderId))
        );
      }
      return asset.folderId === currentFolderId;
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
    folders,
    selectedExtensions,
    searchProps.value,
    sortState,
  ]);

  const visibleFolders = useMemo(() => {
    const normalizedSearch = searchProps.value.trim().toLocaleLowerCase();
    const directFolders = Array.from(folders.values()).filter(
      (folder) =>
        folder.parentId === currentFolderId &&
        (normalizedSearch === "" ||
          folder.name.toLocaleLowerCase().includes(normalizedSearch))
    );
    return sortAssetFolders({
      folders: directFolders,
      allFolders: folders,
      assets: compatibleContainers.flatMap((container) =>
        container.status === "uploaded" ? [container.asset] : []
      ),
      sortState,
    });
  }, [
    compatibleContainers,
    currentFolderId,
    folders,
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

  const handleFolderSelect = (selectedId: string) => {
    setSelection({ type: "folder", id: selectedId });
  };

  const moveAsset = (assetId: string, nextFolderId: string | undefined) => {
    if (moveAssetToFolder(assetId, nextFolderId) === undefined) {
      return;
    }
    const assetName = assetContainers.find(({ asset }) => asset.id === assetId)
      ?.asset.name;
    setAnnouncement(
      `${assetName ?? "Asset"} moved to ${
        nextFolderId === undefined
          ? "No folder"
          : (folders.get(nextFolderId)?.name ?? "folder")
      }.`
    );
  };

  const moveFolder = (movedFolderId: string, parentId: string | undefined) => {
    const result = executeRuntimeMutation({
      id: "assetFolders.update",
      input: {
        folderId: movedFolderId,
        values: { parentId: parentId ?? null },
      },
    });
    if (result === undefined) {
      return;
    }
    setAnnouncement(
      `${folders.get(movedFolderId)?.name ?? "Folder"} moved to ${
        parentId === undefined
          ? "No folder"
          : (folders.get(parentId)?.name ?? "folder")
      }.`
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
          folders={folders}
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
              onSelect={() => handleFolderSelect(folder.id)}
              canManage={canManageFolders}
              canMoveFolder={(movedFolderId) =>
                movedFolderId !== folder.id &&
                getAssetFolderDescendantIds(folders, movedFolderId).has(
                  folder.id
                ) === false
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
              state={
                selection?.type === "asset" &&
                selection.id === assetContainer.asset.id
                  ? "selected"
                  : undefined
              }
              folderPath={
                searchProps.value.length > 0
                  ? formatAssetFolderPath(
                      folders,
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
