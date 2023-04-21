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
  DeprecatedTextFieldContainer,
  DeprecatedTextFieldInput,
  useDeprecatedTextFieldFocus,
  useCombobox,
  type CSS,
  ComboboxLabel,
  ComboboxSeparator,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import {
  forwardRef,
  useState,
  Fragment,
  type ComponentProps,
  type ForwardRefRenderFunction,
  type RefObject,
  type ReactNode,
} from "react";
import { mergeRefs } from "@react-aria/utils";
import type { ComponentState } from "@webstudio-is/react-sdk";
import { type ItemSource, menuCssVars, StyleSource } from "./style-source";
import { useSortable } from "./use-sortable";
import { matchSorter } from "match-sorter";
import { StyleSourceBadge } from "./style-source-badge";
import { CheckMarkIcon, DotIcon } from "@webstudio-is/icons";
import { humanizeString } from "~/shared/string-utils";

type IntermediateItem = {
  id: string;
  label: string;
  disabled: boolean;
  source: ItemSource;
  isAdded?: boolean;
  states: string[];
};

export type ItemSelector = {
  styleSourceId: IntermediateItem["id"];
  state?: string;
};

type TextFieldBaseWrapperProps<Item extends IntermediateItem> = Omit<
  ComponentProps<"input">,
  "value"
> &
  Pick<
    ComponentProps<typeof DeprecatedTextFieldContainer>,
    "variant" | "state" | "css"
  > & {
    value: Array<Item>;
    selectedItemSelector: undefined | ItemSelector;
    label: string;
    disabled?: boolean;
    containerRef?: RefObject<HTMLDivElement>;
    inputRef?: RefObject<HTMLInputElement>;
    renderStyleSourceMenuItems: (item: Item) => ReactNode;
    onChangeItem?: (item: Item) => void;
    onSort?: (items: Array<Item>) => void;
    onSelectItem?: (itemSelector: ItemSelector) => void;
    onEditItem?: (id?: Item["id"]) => void;
    editingItemId?: Item["id"];
    states: { label: string; selector: string }[];
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
    selectedItemSelector,
    renderStyleSourceMenuItems,
    onChangeItem,
    onSort,
    onSelectItem,
    onEditItem,
    editingItemId,
    states,
    ...textFieldProps
  } = props;
  const [internalInputRef, focusProps] = useDeprecatedTextFieldFocus({
    disabled,
    onFocus,
    onBlur,
  });
  const { sortableRefCallback, dragItemId, placementIndicator } = useSortable({
    items: value,
    onSort,
  });

  return (
    <DeprecatedTextFieldContainer
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
          selected={item.id === selectedItemSelector?.styleSourceId}
          state={
            item.id === selectedItemSelector?.styleSourceId
              ? selectedItemSelector.state
              : undefined
          }
          stateLabel={
            item.id === selectedItemSelector?.styleSourceId
              ? states.find((s) => s.selector === selectedItemSelector.state)
                  ?.label
              : undefined
          }
          disabled={item.disabled}
          isDragging={item.id === dragItemId}
          isEditing={item.id === editingItemId}
          source={item.source}
          onChangeEditing={(isEditing) => {
            onEditItem?.(isEditing ? item.id : undefined);
          }}
          onSelect={() => onSelectItem?.({ styleSourceId: item.id })}
          onChangeValue={(label) => {
            onEditItem?.();
            onChangeItem?.({ ...item, label });
          }}
        />
      ))}
      {placementIndicator}
      {/* We want input to be the first element in DOM so it receives the focus first */}
      {editingItemId === undefined && (
        <DeprecatedTextFieldInput
          {...textFieldProps}
          value={label}
          type={type}
          disabled={disabled}
          onClick={onClick}
          ref={mergeRefs(internalInputRef, inputRef ?? null)}
          aria-label="New Style Source Input"
        />
      )}
    </DeprecatedTextFieldContainer>
  );
};

const TextField = forwardRef(TextFieldBase);
TextField.displayName = "TextField";

type StyleSourceInputProps<Item extends IntermediateItem> = {
  items?: Array<Item>;
  value?: Array<Item>;
  selectedItemSelector: undefined | ItemSelector;
  editingItemId?: Item["id"];
  componentStates?: ComponentState[];
  onSelectAutocompleteItem?: (item: Item) => void;
  onRemoveItem?: (id: Item["id"]) => void;
  onDeleteItem?: (id: Item["id"]) => void;
  onDuplicateItem?: (id: Item["id"]) => void;
  onConvertToToken?: (id: Item["id"]) => void;
  onCreateItem?: (label: string) => void;
  onChangeItem?: (item: Item) => void;
  onSelectItem?: (item: ItemSelector) => void;
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
      disabled: false,
      source: "token",
      isAdded: false,
      states: [],
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

const userActionStates = [
  ":hover",
  ":active",
  ":focus",
  ":focus-visible",
  ":focus-within",
];

const renderMenuItems = (props: {
  selectedItemSelector: undefined | ItemSelector;
  item: IntermediateItem;
  states: { selector: string; label: string }[];
  onSelect?: (itemSelector: ItemSelector) => void;
  onEdit?: (itemId: IntermediateItem["id"]) => void;
  onDuplicate?: (itemId: IntermediateItem["id"]) => void;
  onConvertToToken?: (itemId: IntermediateItem["id"]) => void;
  onDisable?: (itemId: IntermediateItem["id"]) => void;
  onEnable?: (itemId: IntermediateItem["id"]) => void;
  onRemove?: (itemId: IntermediateItem["id"]) => void;
  onDelete?: (itemId: IntermediateItem["id"]) => void;
}) => {
  return (
    <>
      {props.item.source !== "local" && (
        <DropdownMenuItem onSelect={() => props.onEdit?.(props.item.id)}>
          Edit Name
        </DropdownMenuItem>
      )}
      {props.item.source !== "local" && (
        <DropdownMenuItem onSelect={() => props.onDuplicate?.(props.item.id)}>
          Duplicate
        </DropdownMenuItem>
      )}
      {props.item.source === "local" && (
        <DropdownMenuItem
          onSelect={() => props.onConvertToToken?.(props.item.id)}
        >
          Convert to token
        </DropdownMenuItem>
      )}
      {/* @todo implement disabling
    {props.disabled ? (
      <DropdownMenuItem onSelect={() => props.onEnable?.(props.itemId)}>
        Enable
      </DropdownMenuItem>
    ) : (
      <DropdownMenuItem onSelect={() => props.onDisable?.(props.itemId)}>
        Disable
      </DropdownMenuItem>
    )}
    */}
      {props.item.source !== "local" && (
        <DropdownMenuItem onSelect={() => props.onRemove?.(props.item.id)}>
          Remove
        </DropdownMenuItem>
      )}
      {props.item.source !== "local" && (
        <DropdownMenuItem
          destructive={true}
          onSelect={() => props.onDelete?.(props.item.id)}
        >
          Delete
        </DropdownMenuItem>
      )}

      <DropdownMenuSeparator />
      <DropdownMenuLabel>States</DropdownMenuLabel>
      {props.states.map(({ label, selector }) => (
        <DropdownMenuItem
          key={selector}
          withIndicator={true}
          icon={
            props.item.id === props.selectedItemSelector?.styleSourceId &&
            selector === props.selectedItemSelector.state ? (
              <CheckMarkIcon
                color={
                  props.item.states.includes(selector)
                    ? rawTheme.colors.foregroundPrimary
                    : rawTheme.colors.foregroundIconMain
                }
              />
            ) : props.item.states.includes(selector) ? (
              <DotIcon color={rawTheme.colors.foregroundPrimary} />
            ) : null
          }
          onSelect={() =>
            props.onSelect?.({
              styleSourceId: props.item.id,
              state: selector,
            })
          }
        >
          {label}
        </DropdownMenuItem>
      ))}
    </>
  );
};

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
      disabled: false,
      id: "",
      source: "local",
      states: [],
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

  const states = [
    ...userActionStates.map((selector) => ({
      selector,
      label: humanizeString(selector),
    })),
    ...(props.componentStates ?? []),
  ];

  return (
    <Combobox>
      <Box {...getComboboxProps()}>
        <ComboboxAnchor>
          <TextField
            // @todo inputProps is any which breaks all types passed to TextField
            {...inputProps}
            renderStyleSourceMenuItems={(item) =>
              renderMenuItems({
                selectedItemSelector: props.selectedItemSelector,
                item,
                states,
                componentStates: props.componentStates,
                onSelect: props.onSelectItem,
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
            states={states}
            selectedItemSelector={props.selectedItemSelector}
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
                    <Fragment key={index}>
                      <ComboboxLabel>New Token</ComboboxLabel>
                      <ComboboxListboxItem
                        {...getItemProps({ item, index })}
                        selectable={false}
                      >
                        <div>
                          Create{" "}
                          <StyleSourceBadge source="token">
                            {item.label}
                          </StyleSourceBadge>
                        </div>
                      </ComboboxListboxItem>
                    </Fragment>
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
                  <Fragment key={index}>
                    {label}
                    <ComboboxListboxItem
                      {...getItemProps({ item, index })}
                      selectable={false}
                    >
                      <StyleSourceBadge source={item.source}>
                        {item.label}
                      </StyleSourceBadge>
                    </ComboboxListboxItem>
                  </Fragment>
                );
              })}
          </ComboboxListbox>
        </ComboboxContent>
      </Box>
    </Combobox>
  );
};
