import { useState } from "react";
import { findNextListIndex, Grid } from "@webstudio-is/design-system";
import type { Asset, ImageAsset } from "@webstudio-is/asset-uploader";
import { AssetsShell, PreviewAsset, useAssets, useSearch } from "../assets";
import { useFilter } from "../assets/use-filter";
import { ImageThumbnail } from "./image-thumbnail";
import { matchSorter } from "match-sorter";

const filterItems = (search: string, items: Array<Asset | PreviewAsset>) => {
  return matchSorter(items, search, {
    keys: [(item) => item.name],
  });
};

const useLogic = ({ onChange }: { onChange?: (asset: Asset) => void }) => {
  const { assets, handleDelete } = useAssets("image");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { filteredItems, resetFilteredItems, setFilteredItems } = useFilter({
    items: assets,
    onReset() {
      searchProps.onCancel();
    },
  });

  const searchProps = useSearch({
    onCancel: resetFilteredItems,
    onSearch(search) {
      if (search === "") {
        return resetFilteredItems();
      }
      const items = filterItems(search, assets);
      setFilteredItems(items);
    },
    onSelect(direction) {
      if (direction === "current") {
        setSelectedIndex(selectedIndex);
        const asset = filteredItems[selectedIndex];
        if (asset?.status === "uploaded") {
          onChange?.(asset);
        }
        return;
      }
      const nextIndex = findNextListIndex(
        selectedIndex,
        filteredItems.length,
        direction
      );
      setSelectedIndex(nextIndex);
    },
  });

  const handleSelect = (asset?: Asset | PreviewAsset) => {
    const selectedIndex = filteredItems.findIndex(
      (item) => item.id === asset?.id
    );
    setSelectedIndex(selectedIndex);
  };

  return {
    searchProps,
    handleDelete,
    filteredItems,
    handleSelect,
    selectedIndex,
  };
};

type ImageManagerProps = {
  onChange?: (asset: Asset) => void;
};

export const ImageManager = ({ onChange }: ImageManagerProps) => {
  const {
    handleDelete,
    handleSelect,
    filteredItems,
    searchProps,
    selectedIndex,
  } = useLogic({ onChange });

  return (
    <AssetsShell
      searchProps={searchProps}
      isEmpty={filteredItems.length === 0}
      type="image"
    >
      <Grid columns={3} gap={2}>
        {filteredItems.map((asset, index) => (
          <ImageThumbnail
            key={asset.id}
            asset={asset}
            onDelete={handleDelete}
            onSelect={handleSelect}
            onChange={onChange}
            state={index === selectedIndex ? "selected" : undefined}
          />
        ))}
      </Grid>
    </AssetsShell>
  );
};
