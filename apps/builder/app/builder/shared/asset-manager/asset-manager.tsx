import { useState, useMemo } from "react";
import { matchSorter } from "match-sorter";
import {
  Grid,
  findNextListItemIndex,
  theme,
  useSearchFieldKeys,
  ToggleGroup,
  ToggleGroupButton,
  Flex,
} from "@webstudio-is/design-system";
import type { Asset } from "@webstudio-is/sdk";
import {
  acceptToMimePatterns,
  doesAssetMatchMimePatterns,
} from "@webstudio-is/asset-uploader";
import { AssetsShell, type AssetContainer, useAssets } from "../assets";
import { AssetThumbnail } from "./asset-thumbnail";

// Define file format categories
const FORMAT_CATEGORIES: Record<string, string[]> = {
  images: ["jpg", "jpeg", "png", "gif", "svg", "webp", "avif", "bmp", "ico"],
  fonts: ["woff", "woff2", "ttf", "otf"],
  documents: ["pdf", "doc", "docx"],
  spreadsheets: ["xls", "xlsx", "csv"],
  presentations: ["ppt", "pptx"],
  code: ["js", "css", "json", "html", "xml"],
  text: ["txt", "md"],
  audio: ["mp3", "wav", "ogg", "m4a"],
  video: ["mp4", "mov", "avi", "webm"],
};

type FormatCategory = string;

const useLogic = ({
  onChange,
  accept,
}: {
  onChange?: (assetId: Asset["id"]) => void;
  accept?: string;
}) => {
  const { assetContainers } = useAssets();

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedFormat, setSelectedFormat] = useState<FormatCategory | "all">(
    "all"
  );

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
  const availableFormats = useMemo(() => {
    const formats = new Set<string>();

    assetContainers.forEach((container) => {
      const format = container.asset.format.toLowerCase();

      for (const [category, extensions] of Object.entries(FORMAT_CATEGORIES)) {
        if (extensions.includes(format)) {
          formats.add(category);
          break;
        }
      }
    });

    return Array.from(formats).sort();
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
    if (selectedFormat !== "all") {
      const allowedExtensions = FORMAT_CATEGORIES[selectedFormat] || [];
      acceptable = acceptable.filter((item) =>
        allowedExtensions.includes(item.asset.format.toLowerCase())
      );
    }

    if (searchProps.value === "") {
      return acceptable;
    }
    return matchSorter(acceptable, searchProps.value, {
      keys: [(item) => item.asset.name],
    });
  }, [assetContainers, accept, searchProps.value, selectedFormat]);

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
    availableFormats,
    selectedFormat,
    setSelectedFormat,
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
    availableFormats,
    selectedFormat,
    setSelectedFormat,
  } = useLogic({
    onChange,
    accept,
  });

  return (
    <AssetsShell
      searchProps={searchProps}
      isEmpty={filteredItems.length === 0}
      type="file"
      accept={accept}
    >
      <>
        {availableFormats.length > 0 && (
          <Flex
            gap="1"
            wrap="wrap"
            css={{
              paddingInline: theme.panel.paddingInline,
              paddingBottom: theme.spacing[5],
            }}
          >
            <ToggleGroup
              type="single"
              value={selectedFormat}
              onValueChange={(value) => {
                if (value) {
                  setSelectedFormat(value);
                }
              }}
              css={{ width: "100%" }}
            >
              <ToggleGroupButton value="all">All</ToggleGroupButton>
              {availableFormats.map((format) => (
                <ToggleGroupButton key={format} value={format}>
                  {format.charAt(0).toUpperCase() + format.slice(1)}
                </ToggleGroupButton>
              ))}
            </ToggleGroup>
          </Flex>
        )}
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
