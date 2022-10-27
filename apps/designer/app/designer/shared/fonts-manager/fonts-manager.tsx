import type { Asset } from "@webstudio-is/asset-uploader";
import {
  Flex,
  useCombobox,
  Separator,
  SearchField,
} from "@webstudio-is/design-system";
import { AssetUpload, PreviewAsset, useAssets } from "~/designer/shared/assets";
import { SYSTEM_FONTS } from "@webstudio-is/fonts";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ItemMenu } from "./item-menu";
import { Listbox, ListboxItem } from "./listbox";

type Item = {
  label: string;
  type: "uploaded" | "system" | "category";
};

const getItems = (assets: Array<Asset | PreviewAsset>): Array<Item> => {
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

const useLogic = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const { assets, handleDelete } = useAssets("font");
  const handleDeleteByLabel = (family: string) => {
    // One family may have multiple assets for different formats, so we need to delete them all.
    const ids = assets
      .filter(
        (asset) =>
          // @todo need to teach ts the right type from useAssets
          "meta" in asset &&
          "family" in asset.meta &&
          asset.meta.family === family
      )
      .map((asset) => asset.id);
    handleDelete(ids);
  };

  const fontItems = useMemo(() => getItems(assets), [assets]);

  const [openMenuItem, setOpenMenuItem] = useState<Item>();

  const selectedItem =
    // After deletion the selected item may not be in the list anymore.
    fontItems.find((item) => item.label === value) ??
    fontItems.find((item) => item.type !== "category") ??
    null;

  const {
    items: filteredItems,
    resetFilter,
    ...comboboxProps
  } = useCombobox({
    items: fontItems,
    value: selectedItem,
    itemToString(item) {
      return item?.type === "category" ? "" : item?.label ?? "";
    },
    onItemSelect(value) {
      if (value !== null) {
        onChange(value.label);
      }
    },
  });

  const { uploadedItems, systemItems } = useMemo(() => {
    const uploadedItems = filteredItems.filter(
      (item) => item.type === "uploaded"
    );
    const systemItems = filteredItems.filter((item) => item.type === "system");
    return { uploadedItems, systemItems };
  }, [filteredItems]);

  useEffect(resetFilter, [fontItems.length, resetFilter]);

  return {
    filteredItems,
    uploadedItems,
    systemItems,
    openMenuItem,
    setOpenMenuItem,
    handleDelete: handleDeleteByLabel,
    ...comboboxProps,
  };
};

type FontsManagerProps = {
  value: string;
  onChange: (value: string) => void;
};

export const FontsManager = ({ value, onChange }: FontsManagerProps) => {
  const {
    filteredItems,
    uploadedItems,
    systemItems,
    getInputProps,
    handleDelete,
    getComboboxProps,
    getMenuProps,
    getItemProps,
    openMenuItem,
    setOpenMenuItem,
  } = useLogic({ value, onChange });

  return (
    <Flex direction="column" css={{ overflow: "hidden", py: "$1" }}>
      <Flex css={{ py: "$2", px: "$3" }} gap="2" direction="column">
        <AssetUpload type="font" />
        <SearchField
          {...getInputProps({ value: undefined })}
          autoFocus
          placeholder="Search"
          onBlur={undefined}
        />
      </Flex>
      <Separator css={{ my: "$1" }} />
      {filteredItems.length === 0 && <NotFound />}
      <Flex
        {...getComboboxProps()}
        css={{
          flexDirection: "column",
          gap: "$3",
          px: "$3",
        }}
      >
        <Listbox {...getMenuProps()}>
          {uploadedItems.length !== 0 && (
            <ListboxItem disabled>{"Uploaded"}</ListboxItem>
          )}
          {uploadedItems.map((item, index) => {
            return (
              <ListboxItem
                {...getItemProps({
                  item,
                  index,
                  highlighted: item === openMenuItem ? true : undefined,
                })}
                key={index}
                suffix={
                  <ItemMenu
                    onOpenChange={(isOpen) => {
                      setOpenMenuItem(isOpen ? item : undefined);
                    }}
                    onDelete={() => {
                      handleDelete(item.label);
                    }}
                  />
                }
              >
                {item.label}
              </ListboxItem>
            );
          })}
          {systemItems.length !== 0 && (
            <>
              <Separator css={{ my: "$1" }} />
              <ListboxItem disabled>{"System"}</ListboxItem>
            </>
          )}
          {systemItems.map((item, index) => {
            return (
              <ListboxItem
                {...getItemProps({
                  item,
                  index: uploadedItems.length + index,
                })}
                key={index}
              >
                {item.label}
              </ListboxItem>
            );
          })}
        </Listbox>
      </Flex>
    </Flex>
  );
};
