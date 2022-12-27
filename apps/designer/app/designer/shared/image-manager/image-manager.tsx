import { useState } from "react";
import { findNextListIndex, Grid } from "@webstudio-is/design-system";
import {
  AssetsShell,
  type AssetContainer,
  useAssets,
  useSearch,
} from "../assets";
import { useFilter } from "../assets/use-filter";
import { ImageThumbnail } from "./image-thumbnail";
import { matchSorter } from "match-sorter";
import { ImageAsset } from "@webstudio-is/asset-uploader";

const filterItems = (search: string, items: AssetContainer[]) => {
  return matchSorter(items, search, {
    keys: [(item) => item.asset.name],
  });
};

const useLogic = ({ onChange }: { onChange?: (asset: ImageAsset) => void }) => {
  const { assetContainers, handleDelete } = useAssets("image");

  const [selectedIndex, setSelectedIndex] = useState(-1);

  // @todo filter out deleting assets
  const { filteredItems, resetFilteredItems, setFilteredItems } = useFilter({
    items: assetContainers,
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
      const items = filterItems(search, assetContainers);
      setFilteredItems(items);
    },
    onSelect(direction) {
      if (direction === "current") {
        setSelectedIndex(selectedIndex);
        const assetContainer = filteredItems[selectedIndex];
        if (
          assetContainer.status === "uploaded" &&
          assetContainer.asset.type === "image"
        ) {
          onChange?.(assetContainer.asset);
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

  const handleSelect = (assetContainer?: AssetContainer) => {
    const selectedIndex = filteredItems.findIndex(
      (item) => item.asset.id === assetContainer?.asset.id
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
  onChange?: (asset: ImageAsset) => void;
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
        {filteredItems.map((assetContainer, index) => (
          <ImageThumbnail
            key={assetContainer.asset.id}
            assetContainer={assetContainer}
            onDelete={handleDelete}
            onSelect={handleSelect}
            onChange={(assetContainer) => {
              // @todo we probably should not allow select uploading images too
              if (
                assetContainer.status === "uploaded" &&
                assetContainer.asset.type === "image"
              ) {
                onChange?.(assetContainer.asset);
              }
            }}
            state={index === selectedIndex ? "selected" : undefined}
          />
        ))}
      </Grid>
    </AssetsShell>
  );
};
