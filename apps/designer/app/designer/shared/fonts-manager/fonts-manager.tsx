import {
  Flex,
  Separator,
  SearchField,
  List,
  ListItem,
  useList,
  findNextListIndex,
} from "@webstudio-is/design-system";
import { AssetUpload, useAssets } from "~/designer/shared/assets";
import { useMemo, useState } from "react";
import { useMenu } from "./item-menu";
import { CheckIcon } from "@webstudio-is/icons";
import {
  type Item,
  filterIdsByFamily,
  filterItems,
  groupItemsByType,
  toItems,
} from "./item-utils";
import { useSearch } from "./use-search";

const NotFound = () => {
  return (
    <Flex align="center" justify="center" css={{ height: 100 }}>
      Font not found
    </Flex>
  );
};

const useLogic = ({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) => {
  const { assets, handleDelete: handleDeleteAssets } = useAssets("font");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const fontItems = useMemo(() => toItems(assets), [assets]);
  const [filteredItems, setFilteredItems] = useState(fontItems);

  const { uploadedItems, systemItems, groupedItems } = useMemo(
    () => groupItemsByType(filteredItems),
    [filteredItems]
  );

  const [currentIndex, setCurrentIndex] = useState(() =>
    groupedItems.findIndex((item) => item.label === value)
  );

  const handleChangeCurrent = (nextCurrentIndex: number) => {
    const item = groupedItems[nextCurrentIndex];
    if (item !== undefined) {
      setCurrentIndex(nextCurrentIndex);
      onChange(item.label);
    }
  };

  const { getItemProps, getListProps } = useList({
    items: groupedItems,
    selectedIndex,
    currentIndex,
    onSelect: setSelectedIndex,
    onChangeCurrent: handleChangeCurrent,
  });

  const handleDelete = (index: number) => {
    const family = groupedItems[index].label;
    const ids = filterIdsByFamily(family, assets);
    handleDeleteAssets(ids);
    setFilteredItems(filteredItems.filter((item) => item.label !== family));
  };

  const getSearchProps = useSearch({
    onCancel() {
      setFilteredItems(fontItems);
    },
    onSearch(search) {
      const items = filterItems(search, fontItems);
      setFilteredItems(items);
    },
    onSelect(direction) {
      if (direction === "current") {
        handleChangeCurrent(selectedIndex);
        return;
      }
      const nextIndex = findNextListIndex(
        selectedIndex,
        groupedItems.length,
        direction
      );
      setSelectedIndex(nextIndex);
    },
  });

  return {
    groupedItems,
    uploadedItems,
    systemItems,
    selectedIndex,
    handleDelete,
    handleSelect: setSelectedIndex,
    getItemProps,
    getListProps,
    getSearchProps,
  };
};

type FontsManagerProps = {
  value: string;
  onChange: (value: string) => void;
};

export const FontsManager = ({ value, onChange }: FontsManagerProps) => {
  const {
    groupedItems,
    uploadedItems,
    systemItems,
    handleDelete,
    handleSelect,
    selectedIndex,
    getListProps,
    getItemProps,
    getSearchProps,
  } = useLogic({ onChange, value });

  const listProps = getListProps();
  const { render: renderMenu, isOpen: isMenuOpen } = useMenu({
    selectedIndex,
    onSelect: handleSelect,
    onDelete: handleDelete,
  });

  const renderItem = (item: Item, index: number) => {
    const itemProps = getItemProps({ index });
    return (
      <ListItem
        {...itemProps}
        prefix={itemProps.current ? <CheckIcon /> : undefined}
        suffix={item.type === "uploaded" ? renderMenu(index) : undefined}
      >
        {item.label}
      </ListItem>
    );
  };

  return (
    <Flex direction="column" css={{ overflow: "hidden", py: "$1" }}>
      <Flex css={{ py: "$2", px: "$3" }} gap="2" direction="column">
        <AssetUpload type="font" />
        <SearchField {...getSearchProps()} autoFocus placeholder="Search" />
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
            if (isMenuOpen === false) {
              listProps.onBlur(event);
            }
          }}
        >
          {uploadedItems.length !== 0 && (
            <ListItem state="disabled">{"Uploaded"}</ListItem>
          )}
          {uploadedItems.map(renderItem)}
          {systemItems.length !== 0 && (
            <>
              {uploadedItems.length !== 0 && <Separator css={{ my: "$1" }} />}
              <ListItem state="disabled">{"System"}</ListItem>
            </>
          )}
          {systemItems.map((item, index) =>
            renderItem(item, index + uploadedItems.length)
          )}
        </List>
      </Flex>
    </Flex>
  );
};
