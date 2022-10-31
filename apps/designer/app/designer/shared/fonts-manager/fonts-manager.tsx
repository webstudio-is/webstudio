import type { Asset } from "@webstudio-is/asset-uploader";
import {
  Flex,
  Separator,
  SearchField,
  List,
  ListItem,
} from "@webstudio-is/design-system";
import { AssetUpload, PreviewAsset, useAssets } from "~/designer/shared/assets";
import { SYSTEM_FONTS } from "@webstudio-is/fonts";
import {
  type KeyboardEventHandler,
  type ChangeEventHandler,
  useMemo,
  useState,
} from "react";
import { matchSorter } from "match-sorter";
import { ItemMenu } from "./item-menu";
import { CheckIcon } from "@webstudio-is/icons";

type Item = {
  label: string;
  type: "uploaded" | "system";
};

const toItems = (assets: Array<Asset | PreviewAsset>): Array<Item> => {
  const system = Array.from(SYSTEM_FONTS.keys()).map((label) => ({
    label,
    type: "system",
  }));
  // We can have 2+ assets with the same family name, so we use a map to dedupe.
  const uploaded = new Map();
  for (const asset of assets) {
    // @todo need to teach ts the right type from useAssets
    if ("meta" in asset && "family" in asset.meta) {
      uploaded.set(asset.meta.family, {
        label: asset.meta.family,
        type: "uploaded",
      });
    }
  }
  return [...uploaded.values(), ...system];
};

const NotFound = () => {
  return (
    <Flex align="center" justify="center" css={{ height: 100 }}>
      Font not found
    </Flex>
  );
};

const filterIdsByFamily = (
  family: string,
  assets: Array<Asset | PreviewAsset>
) => {
  // One family may have multiple assets for different formats, so we need to find them all.
  return assets
    .filter(
      (asset) =>
        // @todo need to teach TS the right type from useAssets
        "meta" in asset &&
        "family" in asset.meta &&
        asset.meta.family === family
    )
    .map((asset) => asset.id);
};

const findNextIndex = (
  currentIndex: number,
  total: number,
  indexOrDirection: number | "next" | "previous"
) => {
  const nextIndex =
    indexOrDirection === "next"
      ? currentIndex + 1
      : indexOrDirection === "previous"
      ? currentIndex - 1
      : indexOrDirection;

  if (nextIndex < 0) {
    return total - 1;
  }
  if (nextIndex >= total) {
    return 0;
  }
  return nextIndex;
};

const groupItemsByType = (items: Array<Item>) => {
  const uploadedItems = items.filter((item) => item.type === "uploaded");
  const systemItems = items.filter((item) => item.type === "system");
  return { uploadedItems, systemItems };
};

const useLogic = ({ onChange }: { onChange: (value: string) => void }) => {
  const { assets, handleDelete } = useAssets("font");
  const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
  const fontItems = useMemo(() => toItems(assets), [assets]);
  const [filteredItems, setFilteredItems] = useState(fontItems);

  const { uploadedItems, systemItems } = useMemo(
    () => groupItemsByType(filteredItems),
    [filteredItems]
  );

  const handleDeleteByLabel = (family: string) => {
    const ids = filterIdsByFamily(family, assets);
    handleDelete(ids);
  };

  const handleCancelSearch = () => {
    setFilteredItems(fontItems);
  };

  const handleSelectItem = (indexOrDirection: number | "next" | "previous") => {
    const nextIndex = findNextIndex(
      selectedItemIndex,
      filteredItems.length,
      indexOrDirection
    );
    setSelectedItemIndex(nextIndex);
  };

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.code === "ArrowUp") {
      handleSelectItem("previous");
      return;
    }
    if (event.code === "ArrowDown") {
      handleSelectItem("next");
      return;
    }

    if (event.code === "Enter") {
      const item = filteredItems[selectedItemIndex];
      if (item !== undefined) onChange(item.label);
      return;
    }
  };

  const handleSearch: ChangeEventHandler<HTMLInputElement> = (event) => {
    const items = matchSorter(fontItems, event.currentTarget.value, {
      keys: [(item) => item.label],
    });
    setFilteredItems(items);
  };

  return {
    filteredItems,
    uploadedItems,
    systemItems,
    selectedItemIndex,
    handleDelete: handleDeleteByLabel,
    handleCancelSearch,
    handleSelectItem,
    handleKeyDown,
    handleSearch,
  };
};

type FontsManagerProps = {
  value: string;
  onChange: (value: string) => void;
};

export const FontsManager = ({ value, onChange }: FontsManagerProps) => {
  const {
    handleSearch,
    filteredItems,
    uploadedItems,
    systemItems,
    handleDelete,
    handleCancelSearch,
    handleSelectItem,
    handleKeyDown,
    selectedItemIndex,
  } = useLogic({ onChange });
  return (
    <Flex direction="column" css={{ overflow: "hidden", py: "$1" }}>
      <Flex css={{ py: "$2", px: "$3" }} gap="2" direction="column">
        <AssetUpload type="font" />
        <SearchField
          autoFocus
          placeholder="Search"
          onCancel={handleCancelSearch}
          onKeyDown={handleKeyDown}
          onChange={handleSearch}
        />
      </Flex>
      <Separator css={{ my: "$1" }} />
      {filteredItems.length === 0 && <NotFound />}
      <Flex
        css={{
          flexDirection: "column",
          gap: "$3",
          px: "$3",
        }}
      >
        <List onKeyDown={handleKeyDown}>
          {uploadedItems.length !== 0 && (
            <ListItem state="disabled">{"Uploaded"}</ListItem>
          )}
          {uploadedItems.map((item, index) => {
            return (
              <ListItem
                key={index}
                state={selectedItemIndex === index ? "selected" : undefined}
                prefix={item.label === value ? <CheckIcon /> : undefined}
                current={item.label === value}
                suffix={
                  selectedItemIndex === index ? (
                    <ItemMenu
                      onOpenChange={() => {
                        handleSelectItem(index);
                      }}
                      onDelete={() => {
                        handleDelete(item.label);
                      }}
                      onFocusTrigger={() => {
                        handleSelectItem(-1);
                      }}
                    />
                  ) : undefined
                }
                onFocus={(event) => {
                  // We need to ignore focus on a menu button inside
                  if (event.target === event.currentTarget) {
                    handleSelectItem(index);
                  }
                }}
                onMouseEnter={() => {
                  handleSelectItem(index);
                }}
                onClick={() => {
                  onChange(item.label);
                }}
              >
                {item.label}
              </ListItem>
            );
          })}
          {systemItems.length !== 0 && (
            <>
              {uploadedItems.length !== 0 && <Separator css={{ my: "$1" }} />}
              <ListItem state="disabled">{"System"}</ListItem>
            </>
          )}
          {systemItems.map((item, index) => {
            const globalIndex = uploadedItems.length + index;
            return (
              <ListItem
                key={globalIndex}
                state={
                  selectedItemIndex === globalIndex ? "selected" : undefined
                }
                prefix={item.label === value ? <CheckIcon /> : undefined}
                current={item.label === value}
                onFocus={() => {
                  handleSelectItem(globalIndex);
                }}
                onMouseEnter={() => {
                  handleSelectItem(globalIndex);
                }}
                onClick={() => {
                  onChange(item.label);
                }}
              >
                {item.label}
              </ListItem>
            );
          })}
        </List>
      </Flex>
    </Flex>
  );
};
