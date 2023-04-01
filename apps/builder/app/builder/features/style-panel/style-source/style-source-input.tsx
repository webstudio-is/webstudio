/*
 * Style Source Input functionality
 * - Type a new input with autocomplete
 * - Select an existing source from a list
 * - Enter a new source
 * - Hover the source to see the menu
 * - Menu provides: Remove, Duplicate, Disable, Edit name
 * - Drag and drop to reorder
 * - Click to toggle select/unselect
 * - Double click to edit name
 * - Local source can only be disabled, nothing else should be possible
 * - Hit Backspace to delete the last Source item when you are in the input
 */

import {
  Box,
  ComboboxListbox,
  ComboboxListboxItem,
  Combobox,
  ComboboxAnchor,
  ComboboxContent,
  TextFieldContainer,
  TextFieldInput,
  useTextFieldFocus,
  useCombobox,
  type CSS,
  ComboboxLabel,
  ComboboxSeparator,
  DropdownMenuItem,
} from "@webstudio-is/design-system";
import {
  forwardRef,
  useState,
  type ComponentProps,
  type ForwardRefRenderFunction,
  type RefObject,
} from "react";
import { mergeRefs } from "@react-aria/utils";
import {
  type ItemSource,
  menuCssVars,
  StyleSource,
  type ItemState,
} from "./style-source";
import { useSortable } from "./use-sortable";
import { theme } from "@webstudio-is/design-system";
import { matchSorter } from "match-sorter";
import { StyleSourceBadge } from "./style-source-badge";

type IntermediateItem = {
  id: string;
  label: string;
  isEditable: boolean;
  state: ItemState;
  source: ItemSource;
  isAdded?: boolean;
};

type TextFieldBaseWrapperProps<Item extends IntermediateItem> = Omit<
  ComponentProps<"input">,
  "value"
> &
  Pick<
    ComponentProps<typeof TextFieldContainer>,
    "variant" | "state" | "css"
  > & {
    value: Array<Item>;
    label: string;
    disabled?: boolean;
    containerRef?: RefObject<HTMLDivElement>;
    inputRef?: RefObject<HTMLInputElement>;
    renderStyleSourceMenuItems: (item: Item) => void;
    onChangeItem?: (item: Item) => void;
    onSort?: (items: Array<Item>) => void;
    onSelectItem?: (item?: Item) => void;
    onEditItem?: (id?: Item["id"]) => void;
    editingItemId?: Item["id"];
  };

const TextFieldBase: ForwardRefRenderFunction<
  HTMLDivElement,
  TextFieldBaseWrapperProps<IntermediateItem>
> = (props, forwardedRef) => {
  const {
    css,
    disabled,
    containerRef,
    inputRef,
    state,
    variant: textFieldVariant,
    onFocus,
    onBlur,
    onClick,
    type,
    onKeyDown,
    label,
    value,
    renderStyleSourceMenuItems,
    onChangeItem,
    onSort,
    onSelectItem,
    onEditItem,
    editingItemId,
    ...textFieldProps
  } = props;
  const [internalInputRef, focusProps] = useTextFieldFocus({
    disabled,
    onFocus,
    onBlur,
  });
  const { sortableRefCallback, dragItemId, placementIndicator } = useSortable({
    items: value,
    onSort,
  });

  return (
    <TextFieldContainer
      {...focusProps}
      aria-disabled={disabled}
      ref={mergeRefs(forwardedRef, containerRef ?? null, sortableRefCallback)}
      state={state}
      variant={textFieldVariant}
      css={{ ...css, px: theme.spacing[3], py: theme.spacing[2] }}
      style={
        dragItemId ? menuCssVars({ show: false, override: true }) : undefined
      }
      onKeyDown={onKeyDown}
    >
      {value.map((item) => (
        <StyleSource
          key={item.id}
          label={item.label}
          menuItems={renderStyleSourceMenuItems(item)}
          id={item.id}
          isDragging={item.id === dragItemId}
          isEditing={item.id === editingItemId}
          state={item.state}
          source={item.source}
          isEditable={item.isEditable}
          onChangeEditing={(isEditing) => {
            onEditItem?.(isEditing ? item.id : undefined);
          }}
          onSelect={() => onSelectItem?.(item)}
          onChangeValue={(label) => {
            onEditItem?.();
            onChangeItem?.({ ...item, label });
          }}
        />
      ))}
      {placementIndicator}
      {/* We want input to be the first element in DOM so it receives the focus first */}
      {editingItemId === undefined && (
        <TextFieldInput
          {...textFieldProps}
          value={label}
          type={type}
          disabled={disabled}
          onClick={onClick}
          ref={mergeRefs(internalInputRef, inputRef ?? null)}
          aria-label="New Style Source Input"
        />
      )}
    </TextFieldContainer>
  );
};

const TextField = forwardRef(TextFieldBase);
TextField.displayName = "TextField";

type StyleSourceInputProps<Item extends IntermediateItem> = {
  items?: Array<Item>;
  value?: Array<Item>;
  editingItemId?: Item["id"];
  onSelectAutocompleteItem?: (item: Item) => void;
  onRemoveItem?: (id: Item["id"]) => void;
  onDeleteItem?: (id: Item["id"]) => void;
  onDuplicateItem?: (id: Item["id"]) => void;
  onConvertToToken?: (id: Item["id"]) => void;
  onCreateItem?: (label: string) => void;
  onChangeItem?: (item: Item) => void;
  onSelectItem?: (item?: Item) => void;
  onEditItem?: (id?: Item["id"]) => void;
  onDisableItem?: (id: Item["id"]) => void;
  onEnableItem?: (id: Item["id"]) => void;
  onSort?: (items: Array<Item>) => void;
  css?: CSS;
};

const newItemId = "__NEW__";

const matchOrSuggestToCreate = (
  search: string,
  items: IntermediateItem[],
  itemToString: (item: IntermediateItem | null) => string
): IntermediateItem[] => {
  const matched = matchSorter(items, search, {
    keys: [itemToString],
  });
  if (
    search.trim() !== "" &&
    itemToString(matched[0]).toLocaleLowerCase() !==
      search.toLocaleLowerCase().trim()
  ) {
    matched.unshift({
      id: newItemId,
      label: search.trim(),
      state: "unselected",
      source: "token",
      isEditable: true,
      isAdded: false,
    });
  }
  // skip already added values
  return matched.filter((item) => item.isAdded === false).slice(0, 5);
};

const markAddedValues = <Item extends IntermediateItem>(
  items: Item[],
  value: Item[]
) => {
  const valueIds = new Set();
  for (const item of value) {
    valueIds.add(item.id);
  }
  return items.map((item) => ({ ...item, isAdded: valueIds.has(item.id) }));
};

const renderMenuItems = (props: {
  itemId: IntermediateItem["id"];
  source: ItemSource;
  state: ItemState;
  onEdit?: (itemId: IntermediateItem["id"]) => void;
  onDuplicate?: (itemId: IntermediateItem["id"]) => void;
  onConvertToToken?: (itemId: IntermediateItem["id"]) => void;
  onDisable?: (itemId: IntermediateItem["id"]) => void;
  onEnable?: (itemId: IntermediateItem["id"]) => void;
  onRemove?: (itemId: IntermediateItem["id"]) => void;
  onDelete?: (itemId: IntermediateItem["id"]) => void;
}) => (
  <>
    {props.source !== "local" && (
      <DropdownMenuItem onSelect={() => props.onEdit?.(props.itemId)}>
        Edit Name
      </DropdownMenuItem>
    )}
    {props.source !== "local" && (
      <DropdownMenuItem onSelect={() => props.onDuplicate?.(props.itemId)}>
        Duplicate
      </DropdownMenuItem>
    )}
    {props.source === "local" && (
      <DropdownMenuItem onSelect={() => props.onConvertToToken?.(props.itemId)}>
        Convert to token
      </DropdownMenuItem>
    )}
    {props.state === "disabled" && (
      <DropdownMenuItem onSelect={() => props.onEnable?.(props.itemId)}>
        Enable
      </DropdownMenuItem>
    )}
    {props.state !== "disabled" && (
      <DropdownMenuItem onSelect={() => props.onDisable?.(props.itemId)}>
        Disable
      </DropdownMenuItem>
    )}
    {props.source !== "local" && (
      <DropdownMenuItem onSelect={() => props.onRemove?.(props.itemId)}>
        Remove
      </DropdownMenuItem>
    )}
    {props.source !== "local" && (
      <DropdownMenuItem
        destructive={true}
        onSelect={() => props.onDelete?.(props.itemId)}
      >
        Delete
      </DropdownMenuItem>
    )}
  </>
);

export const StyleSourceInput = (
  props: StyleSourceInputProps<IntermediateItem>
) => {
  const value = props.value ?? [];
  const [label, setLabel] = useState("");

  const {
    items,
    getInputProps,
    getComboboxProps,
    getMenuProps,
    getItemProps,
    isOpen,
  } = useCombobox<IntermediateItem>({
    items: markAddedValues(props.items ?? [], value),
    value: {
      label,
      state: "unselected",
      id: "",
      source: "local",
      isEditable: true,
    },
    selectedItem: undefined,
    match: matchOrSuggestToCreate,
    defaultHighlightedIndex: 0,
    itemToString: (item) => (item ? item.label : ""),
    onItemSelect(item) {
      setLabel("");
      if (item.id === newItemId) {
        props.onCreateItem?.(item.label);
      } else {
        props.onSelectAutocompleteItem?.(item);
      }
    },
    onInputChange(label) {
      setLabel(label ?? "");
    },
  });

  const inputProps = getInputProps({
    onKeyDown(event) {
      if (
        event.key === "Backspace" &&
        label === "" &&
        props.editingItemId === undefined
      ) {
        const item = value[value.length - 1];
        if (item.source !== "local") {
          props.onRemoveItem?.(item.id);
        }
      }
    },
  });

  let hasNewTokenItem = false;

  return (
    <Combobox>
      <Box {...getComboboxProps()}>
        <ComboboxAnchor>
          <TextField
            {...inputProps}
            renderStyleSourceMenuItems={(item) =>
              renderMenuItems({
                itemId: item.id,
                source: item.source,
                state: item.state,
                onDuplicate: props.onDuplicateItem,
                onConvertToToken: props.onConvertToToken,
                onEnable: props.onEnableItem,
                onDisable: props.onDisableItem,
                onEdit: props.onEditItem,
                onRemove: props.onRemoveItem,
                onDelete: props.onDeleteItem,
              })
            }
            onChangeItem={props.onChangeItem}
            onSelectItem={props.onSelectItem}
            onEditItem={props.onEditItem}
            onSort={props.onSort}
            label={label}
            value={value}
            css={props.css}
            editingItemId={props.editingItemId}
          />
        </ComboboxAnchor>
        <ComboboxContent align="start" sideOffset={5}>
          <ComboboxListbox {...getMenuProps()}>
            {isOpen &&
              items.map((item, index) => {
                if (item.id === newItemId) {
                  hasNewTokenItem = true;
                  return (
                    <>
                      <ComboboxLabel>New Token</ComboboxLabel>
                      <ComboboxListboxItem
                        {...getItemProps({ item, index })}
                        key={index}
                        selectable={false}
                      >
                        <div>
                          Create{" "}
                          <StyleSourceBadge source="token">
                            {item.label}
                          </StyleSourceBadge>
                        </div>
                      </ComboboxListboxItem>
                    </>
                  );
                }

                const firstExistingItemIndex = hasNewTokenItem ? 1 : 0;
                const label = index === firstExistingItemIndex && (
                  <>
                    {hasNewTokenItem && <ComboboxSeparator />}
                    <ComboboxLabel>Existing Tokens</ComboboxLabel>
                  </>
                );
                if (item.source === "local") {
                  return;
                }
                return (
                  <>
                    {label}
                    <ComboboxListboxItem
                      {...getItemProps({ item, index })}
                      key={index}
                      selectable={false}
                    >
                      <StyleSourceBadge source={item.source}>
                        {item.label}
                      </StyleSourceBadge>
                    </ComboboxListboxItem>
                  </>
                );
              })}
          </ComboboxListbox>
        </ComboboxContent>
      </Box>
    </Combobox>
  );
};
