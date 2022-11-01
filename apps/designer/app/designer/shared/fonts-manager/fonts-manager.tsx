import type { Asset } from "@webstudio-is/asset-uploader";
import {
  Flex,
  Separator,
  SearchField,
  List,
  ListItem,
  useList,
  findNextListIndex,
} from "@webstudio-is/design-system";
import { AssetUpload, PreviewAsset, useAssets } from "~/designer/shared/assets";
import { SYSTEM_FONTS } from "@webstudio-is/fonts";
import {
  type KeyboardEventHandler,
  type ChangeEventHandler,
  useMemo,
  useState,
  useRef,
  useEffect,
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

const groupItemsByType = (items: Array<Item>) => {
  const uploadedItems = items.filter((item) => item.type === "uploaded");
  const systemItems = items.filter((item) => item.type === "system");
  const groupedItems = [...uploadedItems, ...systemItems];
  return { uploadedItems, systemItems, groupedItems };
};

const filter = (search: string, items: Array<Item>) => {
  return matchSorter(items, search, {
    keys: [(item) => item.label],
  });
};

const useLogic = ({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) => {
  const { assets, handleDelete } = useAssets("font");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const fontItems = useMemo(() => toItems(assets), [assets]);
  const [filteredItems, setFilteredItems] = useState(fontItems);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const items = filter(search, fontItems);
    setFilteredItems(items);
  }, [fontItems, search]);

  const { uploadedItems, systemItems, groupedItems } = useMemo(
    () => groupItemsByType(filteredItems),
    [filteredItems]
  );

  useEffect(() => {
    setCurrentIndex(groupedItems.findIndex((item) => item.label === value));
  }, []);

  useEffect(() => {
    const item = groupedItems[currentIndex];
    if (item !== undefined) onChange(item.label);
  }, [currentIndex]);

  const { getItemProps, getListProps } = useList({
    items: groupedItems,
    selectedIndex,
    currentIndex,
    onSelect: setSelectedIndex,
    onChangeCurrent: setCurrentIndex,
  });

  const handleDeleteByLabel = (family: string) => {
    const ids = filterIdsByFamily(family, assets);
    handleDelete(ids);
    setFilteredItems(filteredItems.filter((item) => item.label !== family));
  };

  const handleCancelSearch = () => {
    setFilteredItems(fontItems);
  };

  const handleKeyDown: KeyboardEventHandler = (event) => {
    switch (event.code) {
      case "ArrowUp":
      case "ArrowDown": {
        const nextIndex = findNextListIndex(
          selectedIndex,
          groupedItems.length,
          event.code === "ArrowUp" ? "previous" : "next"
        );
        setSelectedIndex(nextIndex);
        break;
      }
      case "Enter": {
        setCurrentIndex(selectedIndex);
        break;
      }
    }
  };

  const handleSearch: ChangeEventHandler<HTMLInputElement> = (event) => {
    setSearch(event.currentTarget.value);
  };

  return {
    search,
    groupedItems,
    uploadedItems,
    systemItems,
    selectedIndex,
    handleDelete: handleDeleteByLabel,
    handleCancelSearch,
    handleSelectItem: setSelectedIndex,
    handleKeyDown,
    handleSearch,
    getItemProps,
    getListProps,
  };
};

type FontsManagerProps = {
  value: string;
  onChange: (value: string) => void;
};

export const FontsManager = ({ value, onChange }: FontsManagerProps) => {
  const {
    search,
    groupedItems,
    uploadedItems,
    systemItems,
    handleSearch,
    handleDelete,
    handleCancelSearch,
    handleSelectItem,
    handleKeyDown,
    selectedIndex,
    getListProps,
    getItemProps,
  } = useLogic({ onChange, value });
  const openMenu = useRef(-1);
  const focusedMenuTrigger = useRef(-1);

  const listProps = getListProps();

  return (
    <Flex direction="column" css={{ overflow: "hidden", py: "$1" }}>
      <Flex css={{ py: "$2", px: "$3" }} gap="2" direction="column">
        <AssetUpload type="font" />
        <SearchField
          value={search}
          autoFocus
          placeholder="Search"
          onCancel={handleCancelSearch}
          onKeyDown={handleKeyDown}
          onChange={handleSearch}
        />
      </Flex>
      <Separator css={{ my: "$1" }} />
      {groupedItems.length === 0 && <NotFound />}
      <Flex
        css={{
          flexDirection: "column",
          gap: "$3",
          px: "$3",
        }}
      >
        <List
          {...listProps}
          onBlur={(event) => {
            if (openMenu.current === -1) {
              listProps.onBlur(event);
            }
          }}
        >
          {uploadedItems.length !== 0 && (
            <ListItem state="disabled">{"Uploaded"}</ListItem>
          )}
          {uploadedItems.map((item, index) => {
            return (
              <ListItem
                {...getItemProps({ index })}
                key={index}
                state={selectedIndex === index ? "selected" : undefined}
                prefix={item.label === value ? <CheckIcon /> : undefined}
                current={item.label === value}
                suffix={
                  selectedIndex === index ||
                  openMenu.current === index ||
                  focusedMenuTrigger.current === index ? (
                    <ItemMenu
                      onOpenChange={(open) => {
                        openMenu.current = open === true ? index : -1;
                        handleSelectItem(index);
                      }}
                      onDelete={() => {
                        handleDelete(item.label);
                      }}
                      onFocusTrigger={() => {
                        focusedMenuTrigger.current = index;
                        handleSelectItem(-1);
                      }}
                      onBlurTrigger={() => {
                        focusedMenuTrigger.current = -1;
                      }}
                    />
                  ) : undefined
                }
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
                {...getItemProps({ index: globalIndex })}
                key={globalIndex}
                state={selectedIndex === globalIndex ? "selected" : undefined}
                prefix={item.label === value ? <CheckIcon /> : undefined}
                current={item.label === value}
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
