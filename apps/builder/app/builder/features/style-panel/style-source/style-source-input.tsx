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
 */

import { nanoid } from "nanoid";
import { useFocusWithin } from "@react-aria/interactions";
import { useStore } from "@nanostores/react";
import {
  Box,
  ComboboxListbox,
  ComboboxListboxItem,
  ComboboxRoot,
  ComboboxAnchor,
  ComboboxContent,
  useCombobox,
  type CSS,
  ComboboxLabel,
  ComboboxSeparator,
  InputField,
  theme,
  styled,
  ComboboxScrollArea,
} from "@webstudio-is/design-system";
import type { StyleSource } from "@webstudio-is/sdk";
import {
  forwardRef,
  useState,
  Fragment,
  type ComponentProps,
  type ForwardRefRenderFunction,
  type RefObject,
  type ReactNode,
  useRef,
  useCallback,
} from "react";
import { mergeRefs } from "@react-aria/utils";
import {
  type ItemSource,
  type ItemSelector,
  type StyleSourceError,
  menuCssVars,
  StyleSourceControl,
} from "./style-source-control";
import { useSortable } from "./use-sortable";
import { matchSorter } from "match-sorter";
import { StyleSourceBadge } from "./style-source-badge";
import { $computedStyleDeclarations } from "../shared/model";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { StyleSourceMenu, type SelectorConfig } from "./style-source-menu";

type IntermediateItem = {
  id: StyleSource["id"];
  label: string;
  disabled: boolean;
  source: ItemSource;
  isAdded?: boolean;
  states: string[];
};

const TextFieldContainer = styled("div", {
  // Custom
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  backgroundColor: theme.colors.backgroundControls,
  gap: theme.spacing[2],
  padding: theme.spacing[2],
  borderRadius: theme.borderRadius[4],
  minWidth: 0,
  border: `1px solid transparent`,
  "&:hover": {
    borderColor: theme.colors.borderMain,
  },
  "&:focus-within": {
    borderColor: theme.colors.borderFocus,
  },
});

type TextFieldBaseWrapperProps<Item extends IntermediateItem> = Omit<
  ComponentProps<typeof InputField>,
  "value"
> &
  Pick<ComponentProps<typeof TextFieldContainer>, "css"> & {
    value: Array<Item>;
    selectedItemSelector: undefined | ItemSelector;
    label: string;
    containerRef?: RefObject<HTMLDivElement>;
    inputRef?: RefObject<HTMLInputElement>;
    renderMenu: (params: {
      item: Item;
      hasStyles: boolean;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }) => ReactNode;
    onChangeItem?: (item: Item) => void;
    onSort?: (items: Array<Item>) => void;
    onSelectItem?: (itemSelector: ItemSelector) => void;
    onEditItem?: (id?: Item["id"]) => void;
    editingItemId?: Item["id"];
    states: { label: string; selector: string }[];
    error?: StyleSourceError;
  };

// Wrapper component to manage menu state per item
const StyleSourceControlWithMenu = <Item extends IntermediateItem>({
  item,
  hasStyles,
  renderMenu,
  ...props
}: Omit<
  ComponentProps<typeof StyleSourceControl>,
  "menu" | "id" | "hasStyles" | "onOpenMenu"
> & {
  item: Item;
  hasStyles: boolean;
  renderMenu: (params: {
    item: Item;
    hasStyles: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => ReactNode;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <StyleSourceControl
      {...props}
      id={item.id}
      hasStyles={hasStyles}
      onOpenMenu={() => setMenuOpen(true)}
      menu={renderMenu({
        item,
        hasStyles,
        open: menuOpen,
        onOpenChange: setMenuOpen,
      })}
    />
  );
};

// Returns true if style source has defined styles including on the states.
const getHasStylesMap = <Item extends IntermediateItem>(
  styleSourceItems: Array<Item>,
  computedStyleDeclarations: Array<ComputedStyleDecl>
) => {
  const map = new Map<Item["id"], boolean>();
  for (const item of styleSourceItems) {
    // Style source has styles on states.
    if (item.states.length > 0) {
      map.set(item.id, true);
    }
    for (const style of computedStyleDeclarations) {
      if (item.id === style.source.styleSourceId) {
        map.set(item.id, true);
        break;
      }
    }
  }
  return map;
};

const TextFieldBase: ForwardRefRenderFunction<
  HTMLDivElement,
  TextFieldBaseWrapperProps<IntermediateItem>
> = (props, forwardedRef) => {
  const {
    css,
    containerRef,
    inputRef,
    onFocus,
    onBlur,
    onClick,
    onKeyDown,
    label,
    value,
    selectedItemSelector,
    renderMenu,
    onChangeItem,
    onSort,
    onSelectItem,
    onEditItem,
    editingItemId,
    states,
    error,
    ...textFieldProps
  } = props;
  const { sortableRefCallback, dragItemId, placementIndicator } = useSortable({
    items: value,
    onSort,
  });
  const internalInputRef = useRef<HTMLInputElement>(null);

  const { focusWithinProps } = useFocusWithin({
    onFocusWithin: onFocus,
    onBlurWithin: onBlur,
  });

  const onClickCapture = useCallback(() => {
    internalInputRef.current?.focus();
  }, [internalInputRef]);

  const computedStyleDeclarations = useStore($computedStyleDeclarations);

  const hasStyles = useCallback(
    (styleSourceId: string) => {
      const hasStylesMap = getHasStylesMap(value, computedStyleDeclarations);
      return hasStylesMap.get(styleSourceId) ?? false;
    },
    [value, computedStyleDeclarations]
  );

  return (
    <TextFieldContainer
      {...focusWithinProps}
      onClickCapture={onClickCapture}
      // Setting tabIndex to -1 to allow this element to be focused via JavaScript.
      // This is used when we need to hide the caret but want to:
      //   1. keep the visual focused state of the component
      //   2. keep focus somewhere insisde the component to not trigger some focus-trap logic
      tabIndex={-1}
      ref={mergeRefs(forwardedRef, containerRef ?? null, sortableRefCallback)}
      css={css}
      style={
        dragItemId ? menuCssVars({ show: false, override: true }) : undefined
      }
      onKeyDown={onKeyDown}
    >
      {/* We want input to be the first element in DOM so it receives the focus first */}
      <InputField
        {...textFieldProps}
        variant="chromeless"
        css={{
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          order: 1,
          flex: 1,
          "&:focus-within, &:hover": {
            borderColor: "transparent",
          },
        }}
        size="1"
        value={label}
        onClick={onClick}
        inputRef={mergeRefs(internalInputRef, inputRef)}
        spellCheck={false}
        aria-label="New Style Source Input"
      />
      {value.map((item) => (
        <StyleSourceControlWithMenu
          key={item.id}
          item={item}
          renderMenu={renderMenu}
          selected={item.id === selectedItemSelector?.styleSourceId}
          state={
            item.id === selectedItemSelector?.styleSourceId
              ? selectedItemSelector.state
              : undefined
          }
          label={item.label}
          stateLabel={
            item.id === selectedItemSelector?.styleSourceId &&
            selectedItemSelector.state
              ? states.find((s) => s.selector === selectedItemSelector.state)
                  ?.label || selectedItemSelector.state
              : undefined
          }
          error={item.id === error?.id ? error : undefined}
          disabled={item.disabled}
          isDragging={item.id === dragItemId}
          isEditing={item.id === editingItemId}
          hasStyles={hasStyles(item.id)}
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
    </TextFieldContainer>
  );
};

const TextField = forwardRef(TextFieldBase);
TextField.displayName = "TextField";

type StyleSourceInputProps<Item extends IntermediateItem> = {
  inputRef: (element: HTMLInputElement | null) => void;
  error?: StyleSourceError;
  items?: Array<Item>;
  value?: Array<Item>;
  selectedItemSelector: undefined | ItemSelector;
  editingItemId?: Item["id"];
  componentStates?: SelectorConfig[];
  onSelectAutocompleteItem?: (item: Item) => void;
  onDetachItem?: (id: Item["id"]) => void;
  onDeleteItem?: (id: Item["id"]) => void;
  onClearStyles?: (id: Item["id"]) => void;
  onDuplicateItem?: (id: Item["id"]) => void;
  onConvertToToken?: (id: Item["id"]) => void;
  onCreateItem?: (id: Item["id"], label: string) => void;
  onChangeItem?: (item: Item) => void;
  onSelectItem?: (item: ItemSelector) => void;
  onEditItem?: (id?: Item["id"]) => void;
  onDisableItem?: (id: Item["id"]) => void;
  onEnableItem?: (id: Item["id"]) => void;
  onSort?: (items: Array<Item>) => void;
  css?: CSS;
};

const newItemId = "__NEW__";

// Maximum amount of tokens we show in the combobox
const maxSuggestedTokens = 50;

const matchOrSuggestToCreate = (
  search: string,
  items: IntermediateItem[],
  itemToString: (item: IntermediateItem | null) => string
): IntermediateItem[] => {
  const matched = matchSorter(items, search, {
    keys: [itemToString],
  });
  const order: ItemSource[] = ["token"];
  matched.sort((leftItem, rightItem) => {
    return order.indexOf(leftItem.source) - order.indexOf(rightItem.source);
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
  return matched
    .filter((item) => item.isAdded === false)
    .slice(0, maxSuggestedTokens);
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
    getItems: () => markAddedValues(props.items ?? [], value),
    value: {
      label,
      disabled: false,
      id: "",
      source: "local",
      states: [],
    },
    selectedItem: undefined,
    match: matchOrSuggestToCreate,
    itemToString: (item) => (item ? item.label : ""),
    onItemSelect(item) {
      setLabel("");
      if (item.id === newItemId) {
        props.onCreateItem?.(nanoid(), item.label);
      } else {
        props.onSelectAutocompleteItem?.(item);
      }
    },
    onChange(label) {
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
        const item = value[value.length - 2];
        if (item) {
          props.onDetachItem?.(item.id);
        }
      }
    },
  });

  let hasNewTokenItem = false;
  let hasGlobalTokenItem = false;

  const states = props.componentStates ?? [];

  return (
    <ComboboxRoot open={isOpen}>
      <Box {...getComboboxProps()}>
        <ComboboxAnchor>
          <TextField
            // @todo inputProps is any which breaks all types passed to TextField
            {...inputProps}
            inputRef={props.inputRef}
            error={props.error}
            renderMenu={({ item, hasStyles, open, onOpenChange }) => (
              <StyleSourceMenu
                open={open}
                onOpenChange={onOpenChange}
                selectedItemSelector={props.selectedItemSelector}
                item={item}
                hasStyles={hasStyles}
                states={states}
                onAddSelector={(itemId, selector) => {
                  props.onSelectItem?.({
                    styleSourceId: itemId,
                    state: selector,
                  });
                }}
                onSelect={props.onSelectItem}
                onDuplicate={props.onDuplicateItem}
                onConvertToToken={props.onConvertToToken}
                onEnable={props.onEnableItem}
                onDisable={props.onDisableItem}
                onEdit={props.onEditItem}
                onDetach={props.onDetachItem}
                onDelete={props.onDeleteItem}
                onClearStyles={props.onClearStyles}
              />
            )}
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
            <ComboboxScrollArea>
              {isOpen &&
                items.map((item, index) => {
                  if (item.source === "local") {
                    return;
                  }

                  if (item.id === newItemId) {
                    hasNewTokenItem = true;
                    const { key, ...itemProps } = getItemProps({ item, index });
                    return (
                      <Fragment key={index}>
                        <ComboboxLabel>New Token</ComboboxLabel>
                        <ComboboxListboxItem
                          {...itemProps}
                          key={key}
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

                  let label = null;
                  if (item.source === "token" && hasGlobalTokenItem === false) {
                    hasGlobalTokenItem = true;
                    label = (
                      <>
                        {hasNewTokenItem && <ComboboxSeparator />}
                        <ComboboxLabel>Global Tokens</ComboboxLabel>
                      </>
                    );
                  }

                  const { key, ...itemProps } = getItemProps({ item, index });
                  return (
                    <Fragment key={index}>
                      {label}
                      <ComboboxListboxItem
                        {...itemProps}
                        key={key}
                        selectable={false}
                      >
                        <StyleSourceBadge source={item.source}>
                          {item.label}
                        </StyleSourceBadge>
                      </ComboboxListboxItem>
                    </Fragment>
                  );
                })}
            </ComboboxScrollArea>
          </ComboboxListbox>
        </ComboboxContent>
      </Box>
    </ComboboxRoot>
  );
};
