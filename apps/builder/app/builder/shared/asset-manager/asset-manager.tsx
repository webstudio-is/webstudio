import { useState, useMemo } from "react";
import { matchSorter } from "match-sorter";
import {
  Flex,
  Grid,
  findNextListItemIndex,
  theme,
  useSearchFieldKeys,
} from "@webstudio-is/design-system";
import type { Asset, AllowedFileExtension } from "@webstudio-is/sdk";
import {
  acceptToMimePatterns,
  doesAssetMatchMimePatterns,
} from "@webstudio-is/sdk";
import { AssetsShell, type AssetContainer, useAssets } from "../assets";
import { AssetThumbnail } from "./asset-thumbnail";
import { AssetFilters } from "./asset-filters";
import { AssetSortSelect, sortAssets, type SortState } from "./asset-sort";

const useLogic = ({
  onChange,
  accept = "*",
}: {
  onChange?: (assetId: Asset["id"]) => void;
  accept?: string;
}) => {
  const { assetContainers } = useAssets();

  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Initialize selectedExtensions based on accept prop
  const [selectedExtensions, setSelectedExtensions] = useState<
    AllowedFileExtension[] | "*"
  >(() => {
    const patterns = acceptToMimePatterns(accept);
    if (patterns === "*") {
      return "*";
    }
    // Convert MIME patterns to extensions
    const extensions: AllowedFileExtension[] = [];
    assetContainers.forEach((container) => {
      if (doesAssetMatchMimePatterns(container.asset, patterns)) {
        const ext =
          container.asset.format.toLowerCase() as AllowedFileExtension;
        if (!extensions.includes(ext)) {
          extensions.push(ext);
        }
      }
    });
    return extensions.length > 0 ? extensions : "*";
  });

  const [sortState, setSortState] = useState<SortState>({
    sortBy: "createdAt",
    order: "desc",
  });

  const searchProps = useSearchFieldKeys({
    onMove({ direction }) {
      if (direction === "current") {
        setSelectedIndex(selectedIndex);
        const assetContainer = filteredItems[selectedIndex];
        if (assetContainer.status === "uploaded") {
          onChange?.(assetContainer.asset.id);
        }
        return;
      }
      const nextIndex = findNextListItemIndex(
        selectedIndex,
        filteredItems.length,
        direction
      );
      setSelectedIndex(nextIndex);
    },
  });

  // Filter assets by accept prop first to get the base set
  const acceptableAssets = useMemo(() => {
    return assetContainers;
  }, [assetContainers]);

  // Get available format counts based on all assets
  const formatCounts = useMemo(() => {
    const counts: Partial<Record<AllowedFileExtension, number>> = {};

    assetContainers.forEach((container) => {
      const format =
        container.asset.format.toLowerCase() as AllowedFileExtension;
      counts[format] = (counts[format] || 0) + 1;
    });

    return counts;
  }, [assetContainers]);

  const filteredItems = useMemo(() => {
    // Start with all assets
    let acceptable = acceptableAssets;

    // Filter by selected extensions (user's category selection)
    if (selectedExtensions !== "*") {
      acceptable = acceptable.filter((item) =>
        selectedExtensions.includes(
          item.asset.format.toLowerCase() as AllowedFileExtension
        )
      );
    }

    let result = acceptable;
    if (searchProps.value !== "") {
      result = matchSorter(acceptable, searchProps.value, {
        keys: [(item) => item.asset.name],
      });
    }

    // Apply sorting
    return sortAssets(result, sortState);
  }, [acceptableAssets, searchProps.value, selectedExtensions, sortState]);

  const handleSelect = (assetContainer?: AssetContainer) => {
    const selectedIndex = filteredItems.findIndex(
      (item) => item.asset.id === assetContainer?.asset.id
    );
    setSelectedIndex(selectedIndex);
  };

  return {
    searchProps,
    filteredItems,
    handleSelect,
    selectedIndex,
    formatCounts,
    selectedExtensions,
    setSelectedExtensions,
    sortState,
    setSortState,
  };
};

type AssetManagerProps = {
  onChange?: (assetId: Asset["id"]) => void;
  /** acceptable file types in the `<imput accept>` attribute format */
  accept?: string;
};

export const AssetManager = ({ accept, onChange }: AssetManagerProps) => {
  const {
    handleSelect,
    filteredItems,
    searchProps,
    selectedIndex,
    formatCounts,
    selectedExtensions,
    setSelectedExtensions,
    sortState,
    setSortState,
  } = useLogic({
    onChange,
    accept,
  });

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
      isEmpty={filteredItems.length === 0}
      type="file"
      accept={accept}
    >
      <>
        <Grid
          columns={3}
          gap="2"
          css={{ paddingInline: theme.panel.paddingInline }}
        >
          {filteredItems.map((assetContainer, index) => (
            <AssetThumbnail
              key={assetContainer.asset.id}
              assetContainer={assetContainer}
              onSelect={handleSelect}
              onChange={(assetContainer) => {
                onChange?.(assetContainer.asset.id);
              }}
              state={index === selectedIndex ? "selected" : undefined}
            />
          ))}
        </Grid>
      </>
    </AssetsShell>
  );
};
