import {
  DeprecatedList,
  DeprecatedListItem,
  useDeprecatedList,
  theme,
  useSearchFieldKeys,
  findNextListItemIndex,
  Tooltip,
  Text,
  rawTheme,
  Link,
  Flex,
} from "@webstudio-is/design-system";
import {
  AssetsShell,
  deleteAssets,
  Separator,
  useAssets,
} from "~/builder/shared/assets";
import { useMemo, useState } from "react";
import { useMenu } from "./item-menu";
import { CheckMarkIcon, InfoCircleIcon } from "@webstudio-is/icons";
import {
  type Item,
  filterIdsByFamily,
  filterItems,
  groupItemsByType,
  toItems,
} from "./item-utils";
import type { FontFamilyValue } from "@webstudio-is/css-engine";

const useLogic = ({ onChange, value }: FontsManagerProps) => {
  const { assetContainers } = useAssets("font");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const fontItems = useMemo(() => toItems(assetContainers), [assetContainers]);

  const searchProps = useSearchFieldKeys({
    onMove({ direction }) {
      if (direction === "current") {
        handleChangeCurrent(selectedIndex);
        return;
      }
      const nextIndex = findNextListItemIndex(
        selectedIndex,
        groupedItems.length,
        direction
      );
      setSelectedIndex(nextIndex);
    },
  });

  const filteredItems = useMemo(
    () =>
      searchProps.value === ""
        ? fontItems
        : filterItems(searchProps.value, fontItems),
    [fontItems, searchProps.value]
  );

  const { uploadedItems, systemItems, groupedItems } = useMemo(
    () => groupItemsByType(filteredItems),
    [filteredItems]
  );

  const currentIndex = useMemo(() => {
    return groupedItems.findIndex((item) => item.label === value?.value[0]);
  }, [groupedItems, value]);

  const handleChangeCurrent = (nextCurrentIndex: number) => {
    const item = groupedItems[nextCurrentIndex];
    if (item !== undefined) {
      onChange(item.label);
    }
  };

  const { getItemProps, getListProps } = useDeprecatedList({
    items: groupedItems,
    selectedIndex,
    currentIndex,
    onSelect: setSelectedIndex,
    onChangeCurrent: handleChangeCurrent,
  });

  const handleDelete = (index: number) => {
    const family = groupedItems[index].label;
    const ids = filterIdsByFamily(family, assetContainers);
    deleteAssets(ids);
    if (index === currentIndex) {
      onChange(undefined);
    }
  };

  return {
    groupedItems,
    uploadedItems,
    systemItems,
    selectedIndex,
    handleDelete,
    handleSelect: setSelectedIndex,
    getItemProps,
    getListProps,
    searchProps,
  };
};

type FontsManagerProps = {
  value?: FontFamilyValue;
  onChange: (value?: string) => void;
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
    searchProps,
  } = useLogic({ onChange, value });

  const listProps = getListProps();
  const { render: renderMenu, isOpen: isMenuOpen } = useMenu({
    selectedIndex,
    onSelect: handleSelect,
    onDelete: handleDelete,
  });

  const renderItem = (item: Item, index: number) => {
    const { key, ...itemProps } = getItemProps({ index });
    return (
      <DeprecatedListItem
        {...itemProps}
        key={key}
        prefix={itemProps.current ? <CheckMarkIcon size={12} /> : undefined}
        suffix={
          item.type === "uploaded" ? (
            renderMenu(index)
          ) : itemProps.state === "selected" && item.description ? (
            <Tooltip
              variant="wrapped"
              content={
                <Flex
                  direction="column"
                  gap="2"
                  css={{ maxWidth: theme.spacing[28] }}
                >
                  <Text variant="titles">{item.label}</Text>
                  <Text
                    variant="monoBold"
                    color="moreSubtle"
                    userSelect="text"
                    css={{
                      whiteSpace: "break-spaces",
                      cursor: "text",
                    }}
                  >
                    {`font-family: ${item.stack.join(", ")};`}
                  </Text>
                  <Text>{item.description}</Text>
                </Flex>
              }
            >
              <InfoCircleIcon
                tabIndex={0}
                color={rawTheme.colors.foregroundSubtle}
              />
            </Tooltip>
          ) : undefined
        }
      >
        {item.label}
      </DeprecatedListItem>
    );
  };

  return (
    <AssetsShell
      searchProps={searchProps}
      type="font"
      isEmpty={groupedItems.length === 0}
    >
      <DeprecatedList
        {...listProps}
        onBlur={(event) => {
          if (isMenuOpen === false) {
            listProps.onBlur(event);
          }
        }}
      >
        {uploadedItems.length !== 0 && (
          <DeprecatedListItem state="disabled">{"Uploaded"}</DeprecatedListItem>
        )}
        {uploadedItems.map(renderItem)}
        {systemItems.length !== 0 && (
          <>
            {uploadedItems.length !== 0 && <Separator />}
            <DeprecatedListItem
              state="disabled"
              suffix={
                <Tooltip
                  variant="wrapped"
                  content={
                    <Text>
                      {
                        "System font stack CSS organized by typeface classification for every modern OS. No downloading, no layout shifts, no flashes— just instant renders. Learn more about "
                      }
                      <Link
                        href="https://github.com/system-fonts/modern-font-stacks"
                        target="_blank"
                        color="inherit"
                        variant="inherit"
                      >
                        modern font stacks
                      </Link>
                      .
                    </Text>
                  }
                >
                  <InfoCircleIcon
                    tabIndex={0}
                    color={rawTheme.colors.foregroundSubtle}
                    style={{ pointerEvents: "auto" }}
                  />
                </Tooltip>
              }
            >
              System
            </DeprecatedListItem>
          </>
        )}
        {systemItems.map((item, index) =>
          renderItem(item, index + uploadedItems.length)
        )}
      </DeprecatedList>
    </AssetsShell>
  );
};
