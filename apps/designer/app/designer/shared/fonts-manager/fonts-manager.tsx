/* This entire module is WIP */
import type { Asset } from "@webstudio-is/asset-uploader";
import {
  Flex,
  TextField,
  DropdownMenu,
  DropdownMenuTrigger,
  IconButton,
  DropdownMenuContent,
  DropdownMenuItem,
  Text,
  DropdownMenuPortal,
  useCombobox,
  Separator,
  styled,
} from "@webstudio-is/design-system";
import { AssetUpload, PreviewAsset, useAssets } from "~/designer/shared/assets";
import { SYSTEM_FONTS } from "@webstudio-is/fonts";
import { DotsHorizontalIcon, MagnifyingGlassIcon } from "@webstudio-is/icons";
import { useMemo } from "react";
import { cssVars } from "@webstudio-is/css-vars";

const getItems = (
  assets: Array<Asset | PreviewAsset>
): Array<{ label: string; type: "uploaded" | "system" | "separator" }> => {
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
  return [
    { label: "Uploaded", type: "separator" },
    ...uploaded.values(),
    { label: "System", type: "separator" },
    ...system,
  ];
};

const vars = {
  menuButtonVisibility: cssVars.define("menuButton"),
};

const MenuButton = styled(IconButton, {
  visibility: cssVars.use(vars.menuButtonVisibility, "hidden"),
  color: "$hint",
  "&:hover": {
    color: "$hiContrast",
    backgroundColor: "transparent",
  },
});

const ItemMenu = ({ onDelete }: { onDelete: () => void }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <MenuButton aria-label="Font menu">
          <DotsHorizontalIcon />
        </MenuButton>
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

const Listbox = styled("ul", {
  display: "flex",
  flexDirection: "column",
  margin: 0,
  padding: 0,
});

const ListboxItem = styled("li", {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: "$5",
  paddingLeft: "$4",
  listStyle: "none",
  borderRadius: "$1",
  "&:hover, &[aria-selected=true]": {
    boxShadow:
      "inset 0px 0px 0px 1px $colors$blue10, 0px 0px 0px 1px $colors$blue10",
    [vars.menuButtonVisibility]: "visible",
  },
  "&[disabled]": {
    pointerEvents: "none",
    color: "$hint",
  },
});

type FontsManagerProps = {
  value: string;
  onChange: (value: string) => void;
};

export const FontsManager = ({ value, onChange }: FontsManagerProps) => {
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
  const selectedItem =
    fontItems.find((item) => item.label === value) ?? fontItems[0];

  const { items, getComboboxProps, getMenuProps, getItemProps, getInputProps } =
    useCombobox({
      items: fontItems,
      value: selectedItem,
      itemToString: (item) => item?.label ?? "",
      onItemSelect: (value) => {
        if (value !== null) {
          onChange(value.label);
        }
      },
    });

  return (
    <Flex direction="column" css={{ overflow: "hidden", py: "$1" }}>
      <Flex css={{ py: "$2", px: "$3" }} gap="2" direction="column">
        <AssetUpload type="font" />
        <TextField
          type="search"
          autoFocus
          placeholder="Search"
          prefix={
            <IconButton
              aria-label="Search"
              css={{ color: "$hint" }}
              tabIndex={-1}
            >
              <MagnifyingGlassIcon />
            </IconButton>
          }
          {...getInputProps()}
        />
      </Flex>

      <Separator css={{ my: "$1" }} />

      <Flex
        {...getComboboxProps()}
        css={{ flexDirection: "column", gap: "$3", px: "$3" }}
      >
        <Listbox {...getMenuProps()}>
          {items.map((item, index) => {
            if (item.type === "separator") {
              return (
                <>
                  {index !== 0 && <Separator css={{ my: "$1" }} />}
                  <ListboxItem
                    {...getItemProps({ item, index })}
                    key={index}
                    aria-disabled
                    disabled
                  >
                    <Text variant="label" truncate>
                      {item.label}
                    </Text>
                  </ListboxItem>
                </>
              );
            }
            return (
              <ListboxItem {...getItemProps({ item, index })} key={index}>
                <Text variant="label" color="contrast" truncate>
                  {item.label}
                </Text>
                {item.type === "uploaded" && (
                  <ItemMenu
                    onDelete={() => {
                      handleDeleteByLabel(item.label);
                    }}
                  />
                )}
              </ListboxItem>
            );
          })}
        </Listbox>
      </Flex>
    </Flex>
  );
};
