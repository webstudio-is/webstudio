import { useState, useMemo } from "react";
import {
  Flex,
  Grid,
  findNextListItemIndex,
  theme,
  useSearchFieldKeys,
} from "@webstudio-is/design-system";
import type { Asset, AllowedFileExtension } from "@webstudio-is/sdk";
import { AssetsShell, type AssetContainer, useAssets } from "../assets";
import { AssetThumbnail } from "./asset-thumbnail";
import { AssetFilters } from "./asset-filters";
import { AssetSortSelect } from "./asset-sort";
import {
  getInitialExtensions,
  calculateFormatCounts,
  filterAndSortAssets,
  findAssetIndex,
  type SortState,
} from "./utils";

type AssetManagerProps = {
  onChange?: (assetId: Asset["id"]) => void;
  /** acceptable file types in the `<imput accept>` attribute format */
  accept?: string;
};

export const AssetManager = ({ accept = "*", onChange }: AssetManagerProps) => {
  const { assetContainers } = useAssets();

  const [selectedIndex, setSelectedIndex] = useState(-1);

  const [selectedExtensions, setSelectedExtensions] = useState<
    AllowedFileExtension[] | "*"
  >(() => getInitialExtensions(accept, assetContainers));

  const [sortState, setSortState] = useState<SortState>({
    sortBy: "createdAt",
    order: "desc",
  });

  const formatCounts = useMemo(
    () => calculateFormatCounts(assetContainers),
    [assetContainers]
  );

  const searchProps = useSearchFieldKeys({
    onMove({ direction }) {
      if (direction === "current") {
        const assetContainer = filteredItems[selectedIndex];
        if (assetContainer?.status === "uploaded") {
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

  const filteredItems = useMemo(
    () =>
      filterAndSortAssets({
        assetContainers,
        selectedExtensions,
        searchQuery: searchProps.value,
        sortState,
      }),
    [assetContainers, selectedExtensions, searchProps.value, sortState]
  );

  const handleSelect = (assetContainer?: AssetContainer) => {
    setSelectedIndex(findAssetIndex(filteredItems, assetContainer?.asset.id));
  };

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
