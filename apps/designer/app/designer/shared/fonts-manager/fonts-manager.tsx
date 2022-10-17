import type { Asset } from "@webstudio-is/asset-uploader";
import {
  Flex,
  Box,
  Combobox,
  ComboboxListboxItem,
  TextField,
  DropdownMenu,
  DropdownMenuTrigger,
  IconButton,
  DropdownMenuContent,
  DropdownMenuItem,
  Text,
  DropdownMenuPortal,
  useCombobox,
  comboboxStateChangeTypes,
} from "@webstudio-is/design-system";
import { AssetUpload, PreviewAsset, useAssets } from "~/designer/shared/assets";
import { SYSTEM_FONTS } from "@webstudio-is/fonts";
import { DotsHorizontalIcon, MagnifyingGlassIcon } from "@webstudio-is/icons";
import { useCallback, useState } from "react";

const getItems = (
  assets: Array<Asset | PreviewAsset>
): Array<{ label: string }> => {
  const system = Array.from(SYSTEM_FONTS.keys()).map((label) => ({ label }));
  // We can have 2+ assets with the same family name, so we use a map to dedupe.
  const uploaded = new Map();
  for (const asset of assets) {
    // @todo need to teach ts the right type from useAssets
    if ("meta" in asset && "family" in asset.meta) {
      uploaded.set(asset.meta.family, { label: asset.meta.family });
    }
  }
  return [...system, ...uploaded.values()];
};

const ItemMenu = ({ onDelete }: { onDelete: () => void }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label="Font menu button">
          <DotsHorizontalIcon />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={() => {
              onDelete();
            }}
          >
            <Text>Delete font</Text>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};

type FontsManagerProps = {
  value: string;
  onChange: (value: string) => void;
};

export const FontsManager = ({ value, onChange }: FontsManagerProps) => {
  const { assets, onSubmitAssets, onActionData, onDelete } = useAssets("font");

  const handleDelete = (family: string) => {
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
    onDelete(ids);
  };

  const stateReducer = useCallback((state, actionAndChanges) => {
    const { type, changes } = actionAndChanges;
    switch (type) {
      // on item selection.
      case comboboxStateChangeTypes.ItemClick:
      case comboboxStateChangeTypes.InputKeyDownEnter:
      case comboboxStateChangeTypes.InputBlur:
      case comboboxStateChangeTypes.ControlledPropUpdatedSelectedItem:
        return {
          ...changes,
          // if we have a selected item.
          ...(changes.selectedItem && {
            // we will set the input value to "" (empty string).
            inputValue: "",
          }),
        };

      // Remove "reset" action
      case comboboxStateChangeTypes.InputKeyDownEscape: {
        return {
          ...state,
        };
      }

      default:
        return changes; // otherwise business as usual.
    }
  }, []);

  const { items, getComboboxProps, getMenuProps, getItemProps, getInputProps } =
    useCombobox({
      items: getItems(assets),
      value: { label: value },
      itemToString: (item) => item?.label ?? "",
      stateReducer,
      onItemSelect: (value) => {
        if (value !== null) {
          onChange(value.label);
        }
      },
    });

  return (
    <Flex
      gap="3"
      direction="column"
      css={{ padding: "$1", paddingTop: "$2", height: 460, overflow: "hidden" }}
    >
      <Box css={{ padding: "$2" }}>
        <AssetUpload
          onSubmit={onSubmitAssets}
          onActionData={onActionData}
          type="font"
        />
      </Box>

      <Flex
        {...getComboboxProps()}
        css={{ flexDirection: "column", gap: "$3" }}
      >
        <TextField
          type="search"
          prefix={<MagnifyingGlassIcon />}
          {...getInputProps({})}
        />
        <fieldset>
          <legend>Choose an item</legend>
          <Flex {...getMenuProps()} css={{ flexDirection: "column" }}>
            {items.map((item, index) => {
              return (
                <ComboboxListboxItem
                  key={index}
                  {...getItemProps({ item, index })}
                >
                  {item.label}
                </ComboboxListboxItem>
              );
            })}
          </Flex>
        </fieldset>
      </Flex>
    </Flex>
  );
};
