import { useState, useMemo } from "react";
import { matchSorter } from "match-sorter";
import {
  deprecatedFindNextListIndex,
  Grid,
  theme,
} from "@webstudio-is/design-system";
import type { ImageAsset } from "@webstudio-is/sdk";
import {
  acceptToMimePatterns,
  doesAssetMatchMimePatterns,
} from "@webstudio-is/asset-uploader";
import {
  AssetsShell,
  type AssetContainer,
  useAssets,
  useSearch,
  deleteAssets,
} from "../assets";
import { ImageThumbnail } from "./image-thumbnail";

const useLogic = ({
  onChange,
  accept,
}: {
  onChange?: (asset: ImageAsset) => void;
  accept?: string;
}) => {
  const { assetContainers } = useAssets("image");

  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchProps = useSearch({
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
      const nextIndex = deprecatedFindNextListIndex(
        selectedIndex,
        filteredItems.length,
        direction
      );
      setSelectedIndex(nextIndex);
    },
  });

  const filteredItems = useMemo(() => {
    let acceptable = assetContainers;
    const patterns = acceptToMimePatterns(accept ?? "");
    if (patterns !== "*") {
      acceptable = assetContainers.filter((item) =>
        doesAssetMatchMimePatterns(item.asset, patterns)
      );
    }
    if (searchProps.value === "") {
      return acceptable;
    }
    return matchSorter(acceptable, searchProps.value, {
      keys: [(item) => item.asset.name],
    });
  }, [assetContainers, accept, searchProps.value]);

  const handleSelect = (assetContainer?: AssetContainer) => {
    const selectedIndex = filteredItems.findIndex(
      (item) => item.asset.id === assetContainer?.asset.id
    );
    setSelectedIndex(selectedIndex);
  };

  return {
    searchProps,
    handleDelete: deleteAssets,
    filteredItems,
    handleSelect,
    selectedIndex,
  };
};

type ImageManagerProps = {
  onChange?: (asset: ImageAsset) => void;
  /** acceptable file types in the `<imput accept>` attribute format */
  accept?: string;
};

export const ImageManager = ({ accept, onChange }: ImageManagerProps) => {
  const {
    handleDelete,
    handleSelect,
    filteredItems,
    searchProps,
    selectedIndex,
  } = useLogic({ onChange, accept });

  return (
    <AssetsShell
      searchProps={searchProps}
      isEmpty={filteredItems.length === 0}
      type="image"
      accept={accept}
    >
      <Grid columns={3} gap={2} css={{ px: theme.spacing[9] }}>
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
