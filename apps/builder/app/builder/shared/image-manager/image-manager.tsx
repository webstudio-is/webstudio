import { useState, useMemo } from "react";
import { matchSorter } from "match-sorter";
import {
  Grid,
  findNextListItemIndex,
  theme,
  useSearchFieldKeys,
} from "@webstudio-is/design-system";
import type { ImageAsset } from "@webstudio-is/sdk";
import {
  acceptToMimePatterns,
  doesAssetMatchMimePatterns,
} from "@webstudio-is/asset-uploader";
import { AssetsShell, type AssetContainer, useAssets } from "../assets";
import { ImageThumbnail } from "./image-thumbnail";

const useLogic = ({
  onChange,
  accept,
}: {
  onChange?: (assetId: ImageAsset["id"]) => void;
  accept?: string;
}) => {
  const { assetContainers } = useAssets("image");

  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchProps = useSearchFieldKeys({
    onMove({ direction }) {
      if (direction === "current") {
        setSelectedIndex(selectedIndex);
        const assetContainer = filteredItems[selectedIndex];
        if (
          assetContainer.status === "uploaded" &&
          assetContainer.asset.type === "image"
        ) {
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
    filteredItems,
    handleSelect,
    selectedIndex,
  };
};

type ImageManagerProps = {
  onChange?: (assetId: ImageAsset["id"]) => void;
  /** acceptable file types in the `<imput accept>` attribute format */
  accept?: string;
};

export const ImageManager = ({ accept, onChange }: ImageManagerProps) => {
  const { handleSelect, filteredItems, searchProps, selectedIndex } = useLogic({
    onChange,
    accept,
  });

  // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/accept
  // https://github.com/webstudio-is/webstudio/blob/83503e39b0e1561ea93cfcff92aa35b54c15fefa/packages/sdk-components-react/src/video.ws.ts#L34
  //
  // To reproduce:
  // 1. Create Video Animation
  // 2. Open "Video" component properties
  // 3. Click "Choose source" button
  // 4. See ImageManager allows upload all image and video files
  // 5. See ImageManager do not filter video files based on accept parameter
  // 6. But see accept = ".mp4,.webm,.mpg,.mpeg,.mov" is right here
  console.info(
    "@todo accept for video tag should allow only video uploads and filter items",
    accept
  );

  return (
    <AssetsShell
      searchProps={searchProps}
      isEmpty={filteredItems.length === 0}
      type="image"
      accept={accept}
    >
      <Grid
        columns={3}
        gap="2"
        css={{ paddingInline: theme.panel.paddingInline }}
      >
        {filteredItems.map((assetContainer, index) => (
          <ImageThumbnail
            key={assetContainer.asset.id}
            assetContainer={assetContainer}
            onSelect={handleSelect}
            onChange={(assetContainer) => {
              if (assetContainer.asset.type === "image") {
                onChange?.(assetContainer.asset.id);
              }
            }}
            state={index === selectedIndex ? "selected" : undefined}
          />
        ))}
      </Grid>
    </AssetsShell>
  );
};
