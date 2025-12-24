import { useState, useMemo } from "react";
import { matchSorter } from "match-sorter";
import {
  Flex,
  Grid,
  findNextListItemIndex,
  theme,
  useSearchFieldKeys,
} from "@webstudio-is/design-system";
import type { Asset } from "@webstudio-is/sdk";
import { FILE_EXTENSIONS_BY_CATEGORY } from "@webstudio-is/sdk";
import {
  acceptToMimePatterns,
  doesAssetMatchMimePatterns,
} from "@webstudio-is/asset-uploader";
import { AssetsShell, type AssetContainer, useAssets } from "../assets";
import { AssetThumbnail } from "./asset-thumbnail";
import { AssetFilters } from "./asset-filters";
import { AssetSortSelect, sortAssets, type SortState } from "./asset-sort";

type FormatCategory = keyof typeof FILE_EXTENSIONS_BY_CATEGORY;

const ALL_FORMATS = "all" as const;

const useLogic = ({
  onChange,
  accept,
}: {
  onChange?: (assetId: Asset["id"]) => void;
  accept?: string;
}) => {
  const { assetContainers } = useAssets();

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedFormat, setSelectedFormat] = useState<
    FormatCategory | typeof ALL_FORMATS
  >(ALL_FORMATS);
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

  // Get available format categories based on existing assets
  const formatCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    assetContainers.forEach((container) => {
      const format = container.asset.format.toLowerCase();

      for (const [category, extensions] of Object.entries(
        FILE_EXTENSIONS_BY_CATEGORY
      )) {
        if (extensions.includes(format)) {
          counts[category] = (counts[category] || 0) + 1;
          break;
        }
      }
    });

    return counts;
  }, [assetContainers]);

  const filteredItems = useMemo(() => {
    let acceptable = assetContainers;
    const patterns = acceptToMimePatterns(accept ?? "");

    if (patterns !== "*") {
      acceptable = assetContainers.filter((item) =>
        doesAssetMatchMimePatterns(item.asset, patterns)
      );
    } else if (accept !== undefined) {
      // Filter by file extension
      const extensions = accept.split(",").map((ext) => ext.trim());
      acceptable = assetContainers.filter((item) =>
        extensions.some((ext) => item.asset.name.endsWith(ext))
      );
    }

    // Filter by selected format category
    if (selectedFormat !== ALL_FORMATS) {
      const allowedExtensions =
        FILE_EXTENSIONS_BY_CATEGORY[selectedFormat] || [];
      acceptable = acceptable.filter((item) =>
        allowedExtensions.includes(item.asset.format.toLowerCase())
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
  }, [assetContainers, accept, searchProps.value, selectedFormat, sortState]);

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
    selectedFormat,
    setSelectedFormat,
    sortState,
    setSortState,
  };
};

type AssetManagerProps = {
  onChange?: (assetId: Asset["id"]) => void;
  /** acceptable file types in the `<imput accept>` attribute format */
  accept?: string;
  /** whether to show format filters dropdown */
  showFilters?: boolean;
};

export const AssetManager = ({
  accept,
  onChange,
  showFilters = false,
}: AssetManagerProps) => {
  const {
    handleSelect,
    filteredItems,
    searchProps,
    selectedIndex,
    formatCounts,
    selectedFormat,
    setSelectedFormat,
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
          {showFilters && (
            <AssetFilters
              formatCounts={formatCounts}
              selectedFormat={selectedFormat}
              onFormatChange={setSelectedFormat}
            />
          )}
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
