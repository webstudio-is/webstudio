import { CheckIcon } from "@radix-ui/react-icons";
import { useCombobox } from "downshift";
import { matchSorter } from "match-sorter";
import { type ComponentProps, useState } from "react";
import {
  Box,
  Popover,
  PopoverContent,
  PopoverTrigger,
  styled,
} from "~/shared/design-system";
import { itemCss } from "~/shared/design-system/components/menu";
import { panelStyles } from "~/shared/design-system/components/panel";
import { ChevronDownIcon } from "~/shared/icons";
import { IconButton } from "./icon-button";
import { TextField } from "./text-field";

type BaseOption = { label: string };

const getTextValue = <Option extends BaseOption>(option?: Option) => {
  return option ? option.label : "";
};

type DisclosureProps = ComponentProps<typeof TextField>;

type ComboboxProps<Option> = {
  name: string;
  options: ReadonlyArray<Option>;
  value?: Option;
  onOptionSelect?: (value: Option) => void;
  onOptionHighlight?: (value?: Option) => void;
  disclosure?: (props: DisclosureProps) => JSX.Element;
};

const Listbox = styled("ul", panelStyles, { padding: 0, margin: 0 });
const ListboxItem = styled("li", itemCss, { padding: 0, margin: 0 });

export const Combobox = <Option extends BaseOption>({
  options,
  value,
  name,
  onOptionSelect,
  onOptionHighlight,
  disclosure = (props) => <TextField {...props} />,
}: ComboboxProps<Option>) => {
  const [items, setItems] = useState(options);
  const {
    isOpen,
    // getToggleButtonProps,
    // getLabelProps,
    getMenuProps,
    getInputProps,
    getComboboxProps,
    highlightedIndex,
    getItemProps,
    selectedItem,
  } = useCombobox({
    onInputValueChange({ inputValue }) {
      const filteredItems = matchSorter(options, inputValue, {
        keys: ["label", "value"],
      });
      setItems(filteredItems);
    },
    items,
    selectedItem: value,
    itemToString(item) {
      return item ? item.label : "";
    },
    onSelectedItemChange({ selectedItem }) {
      onOptionSelect?.(selectedItem);
    },
    onHighlightedIndexChange({ highlightedIndex }) {
      onOptionHighlight?.(items[highlightedIndex]);
    },
  });

  return (
    <Box
      {...getComboboxProps()}
      css={{
        position: "relative",
      }}
    >
      {disclosure(getInputProps({ name }))}
      {/*<IconButton variant="ghost" size="1">*/}
      {/*  <ChevronDownIcon />*/}
      {/*</IconButton>*/}
      {isOpen && (
        <Listbox
          {...getMenuProps()}
          css={{
            position: "absolute",
            width: "100%",
          }}
        >
          {items.map((item, index) => {
            return (
              <ListboxItem
                key={index}
                {...getItemProps({
                  item,
                  index,
                  disabled: item.disabled,
                  ...(item.disabled ? { "data-disabled": true } : {}),
                  ...(highlightedIndex === index ? { "data-found": true } : {}),
                })}
              >
                {getTextValue<Option>(item)}
                {selectedItem === item && <CheckIcon />}
              </ListboxItem>
            );
          })}
        </Listbox>
      )}
    </Box>
  );
};
