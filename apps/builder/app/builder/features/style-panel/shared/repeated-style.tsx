import { useMemo, type ComponentProps, type JSX } from "react";
import type { RgbaColor } from "colord";
import {
  toValue,
  type CssProperty,
  type LayersValue,
  type StyleValue,
  type TupleValue,
  type UnparsedValue,
} from "@webstudio-is/css-engine";
import { parseCssValue, propertiesData } from "@webstudio-is/css-data";
import { EyeClosedIcon, EyeOpenIcon, MinusIcon } from "@webstudio-is/icons";
import {
  CssValueListArrowFocus,
  CssValueListItem,
  Flex,
  Label,
  SmallIconButton,
  SmallToggleButton,
  toast,
  useSortable,
  FloatingPanel,
} from "@webstudio-is/design-system";
import { repeatUntil } from "~/shared/array-utils";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { createBatchUpdate, type StyleUpdateOptions } from "./use-style-data";
import { ColorThumb } from "./color-thumb";

const isRepeatedValue = (
  styleValue: StyleValue
): styleValue is LayersValue | TupleValue =>
  styleValue.type === "layers" || styleValue.type === "tuple";

const reparseComputedValue = (styleDecl: ComputedStyleDecl) => {
  const property = styleDecl.property;
  const serialized = toValue(styleDecl.computedValue);
  return parseCssValue(property, serialized);
};

export const getComputedRepeatedItem = (
  styleDecl: ComputedStyleDecl,
  index: number
) => {
  const value = reparseComputedValue(styleDecl);
  const items = isRepeatedValue(value) ? value.value : [];
  if (
    isRepeatedValue(styleDecl.cascadedValue) &&
    styleDecl.cascadedValue.value.length !== items.length
  ) {
    return;
  }
  return items[index % items.length];
};

const isItemHidden = (styleValue: StyleValue, index: number) => {
  let hidden = false;
  if (styleValue.type === "var") {
    hidden = styleValue.hidden ?? false;
  }
  if (isRepeatedValue(styleValue)) {
    hidden = styleValue.value[index].hidden ?? false;
  }
  return hidden;
};

/**
 * shows cascaded value
 * or resolves css variable and provide reparsed version
 * so for example gradients in variable are unparsed
 * but this utility converts them into layers
 */
const getComputedValue = (styleDecl: ComputedStyleDecl) => {
  if (styleDecl.cascadedValue.type === "var") {
    const property = styleDecl.property;
    const serialized = toValue(styleDecl.computedValue);
    return parseCssValue(property, serialized);
  }
  return styleDecl.cascadedValue;
};

export const getRepeatedStyleItem = (
  styleDecl: ComputedStyleDecl,
  index: number
) => {
  const styleValue = getComputedValue(styleDecl);
  if (styleValue.type === "layers" || styleValue.type === "tuple") {
    return styleValue.value[index % styleValue.value.length];
  }
};

type ItemType = "layers" | "tuple";

const normalizeStyleValue = (
  styleDecl: ComputedStyleDecl,
  primaryValue: StyleValue,
  itemType: ItemType = primaryValue.type === "tuple" ? "tuple" : "layers"
) => {
  const primaryItemsCount =
    primaryValue.type === itemType ? primaryValue.value.length : 0;
  const value = styleDecl.cascadedValue;
  const items = value.type === itemType ? value.value : [];
  // prefill initial value when no items to repeated
  if (items.length === 0 && primaryItemsCount > 0) {
    const meta = propertiesData[styleDecl.property];
    if (meta) {
      items.push(meta.initial as UnparsedValue);
    }
  }
  return {
    type: itemType,
    value: repeatUntil(items, primaryItemsCount),
  } as TupleValue | LayersValue;
};

export const addRepeatedStyleItem = (
  styles: ComputedStyleDecl[],
  newItems: Map<CssProperty, StyleValue>
) => {
  if (styles[0].cascadedValue.type === "var") {
    const primaryValue = reparseComputedValue(styles[0]);
    if (isRepeatedValue(primaryValue) && primaryValue.value.length > 1) {
      toast.error("Cannot add styles to css variable");
      return;
    }
  }
  const batch = createBatchUpdate();
  const currentStyles = new Map(
    styles.map((styleDecl) => [styleDecl.property, styleDecl])
  );
  const primaryValue = styles[0].cascadedValue;
  let primaryCount = 0;
  if (isRepeatedValue(primaryValue)) {
    primaryCount = primaryValue.value.length;
  }
  if (primaryValue.type === "var") {
    primaryCount = 1;
  }
  for (const [property, newValue] of newItems) {
    if (newValue.type !== "layers" && newValue.type !== "tuple") {
      continue;
    }
    // infer type from new items
    // because current values could be css wide keywords
    const valueType: ItemType = newValue.type;
    const styleDecl = currentStyles.get(property);
    if (styleDecl === undefined) {
      continue;
    }
    let oldItems: StyleValue[] = [];
    if (styleDecl.cascadedValue.type === "var") {
      oldItems = repeatUntil([styleDecl.cascadedValue], primaryCount);
    } else if (styleDecl.cascadedValue.type === valueType) {
      oldItems = repeatUntil(styleDecl.cascadedValue.value, primaryCount);
    } else if (primaryCount > 0) {
      const meta = propertiesData[property];
      if (meta) {
        oldItems = repeatUntil([meta.initial], primaryCount);
      }
    }
    batch.setProperty(property)({
      type: valueType,
      value: [...oldItems, ...newValue.value] as UnparsedValue[],
    });
  }
  batch.publish();
};

export const editRepeatedStyleItem = (
  styles: ComputedStyleDecl[],
  index: number,
  newItems: Map<CssProperty, StyleValue>,
  options?: StyleUpdateOptions
) => {
  const batch = createBatchUpdate();
  const currentStyles = new Map(
    styles.map((styleDecl) => [styleDecl.property, styleDecl])
  );
  for (const [property, value] of newItems) {
    const styleDecl = currentStyles.get(property);
    if (styleDecl === undefined) {
      continue;
    }
    let items: StyleValue[] = [];
    if (styleDecl.cascadedValue.type === "var") {
      items = [styleDecl.cascadedValue];
    }
    if (isRepeatedValue(styleDecl.cascadedValue)) {
      items = styleDecl.cascadedValue.value;
    }
    if (items.length <= 1 && value.type === "var") {
      batch.setProperty(property)(value);
    } else {
      let valueType;
      if (isRepeatedValue(styleDecl.cascadedValue)) {
        valueType = styleDecl.cascadedValue.type;
      }
      if (isRepeatedValue(value)) {
        valueType = value.type;
      }
      if (valueType === undefined) {
        continue;
      }
      const newItems: StyleValue[] = [...items];
      if (value.type === "var") {
        newItems.splice(index, 1, value);
      }
      if (isRepeatedValue(value)) {
        newItems.splice(index, 1, ...value.value);
      }
      const newValue = {
        type: valueType,
        value: newItems as UnparsedValue[],
      };
      batch.setProperty(property)(newValue);
    }
  }
  batch.publish(options);
};

export const setRepeatedStyleItem = (
  styleDecl: ComputedStyleDecl,
  index: number,
  newItem: StyleValue,
  options?: StyleUpdateOptions
) => {
  const batch = createBatchUpdate();
  const value = styleDecl.cascadedValue;
  const valueType: ItemType = value.type === "tuple" ? "tuple" : "layers";
  const oldItems = value.type === valueType ? value.value : [];
  const newItems: StyleValue[] = repeatUntil(oldItems, index);
  // unpack item when layers or tuple is provided
  newItems[index] = newItem.type === valueType ? newItem.value[0] : newItem;
  batch.setProperty(styleDecl.property)({
    type: valueType,
    value: newItems as UnparsedValue[],
  });
  batch.publish(options);
};

export const deleteRepeatedStyleItem = (
  styles: ComputedStyleDecl[],
  index: number
) => {
  const batch = createBatchUpdate();
  const primaryValue = styles[0].cascadedValue;
  const primaryCount = isRepeatedValue(primaryValue)
    ? primaryValue.value.length
    : index + 1;
  for (const styleDecl of styles) {
    const property = styleDecl.property;
    const newValue = structuredClone(styleDecl.cascadedValue);
    if (isRepeatedValue(newValue)) {
      newValue.value = repeatUntil(newValue.value, primaryCount);
      newValue.value.splice(index, 1);
      if (newValue.value.length === 1 && newValue.value[0].type === "var") {
        batch.setProperty(property)(newValue.value[0]);
      } else if (newValue.value.length > 0) {
        batch.setProperty(property)(newValue);
      } else {
        // delete empty layers or tuple
        batch.deleteProperty(property);
      }
    } else {
      batch.deleteProperty(property);
    }
  }
  batch.publish();
};

export const toggleRepeatedStyleItem = (
  styles: ComputedStyleDecl[],
  index: number
) => {
  const batch = createBatchUpdate();
  const primaryValue = styles[0].cascadedValue;
  const primaryCount = isRepeatedValue(primaryValue)
    ? primaryValue.value.length
    : index + 1;
  const isHidden = isItemHidden(primaryValue, index);
  for (const styleDecl of styles) {
    const property = styleDecl.property;
    const newValue = structuredClone(styleDecl.cascadedValue);
    if (newValue.type === "var") {
      newValue.hidden = !isHidden;
      batch.setProperty(property)(newValue);
    }
    if (isRepeatedValue(newValue)) {
      newValue.value = repeatUntil(newValue.value, primaryCount);
      newValue.value[index] = structuredClone(newValue.value[index]);
      newValue.value[index].hidden = !isHidden;
      batch.setProperty(property)(newValue);
    }
    // other values are repeated automatically
    // and it is irrelevant to change their visibility
  }
  batch.publish();
};

export const swapRepeatedStyleItems = (
  styles: ComputedStyleDecl[],
  oldIndex: number,
  newIndex: number
) => {
  if (styles[0].cascadedValue.type === "var") {
    toast.error("Cannot reorder styles from css variable");
    return;
  }
  const batch = createBatchUpdate();
  const primaryValue = styles[0].cascadedValue;
  for (const styleDecl of styles) {
    const newValue = normalizeStyleValue(styleDecl, primaryValue);
    // You can swap only if there are at least two layers
    // As we are checking across multiple properties, we can't be sure
    // which property don't have two layers so we are checking here.
    if (newValue.value.length >= 2) {
      const oldItem = newValue.value[oldIndex];
      newValue.value.splice(oldIndex, 1);
      newValue.value.splice(newIndex, 0, oldItem);
    }
    batch.setProperty(styleDecl.property)(newValue);
  }
  batch.publish();
};

export const RepeatedStyle = (props: {
  label: string;
  styles: ComputedStyleDecl[];
  getItemProps: (
    index: number,
    primaryValue: StyleValue
  ) => { label: string; color?: RgbaColor };
  floatingPanelOffset?: ComponentProps<typeof FloatingPanel>["offset"];
  renderThumbnail?: (index: number, primaryItem: StyleValue) => JSX.Element;
  renderItemContent: (index: number, primaryItem: StyleValue) => JSX.Element;
}) => {
  const {
    label,
    styles,
    getItemProps,
    renderThumbnail,
    renderItemContent,
    floatingPanelOffset,
  } = props;
  // first property should describe the amount of layers or tuple items
  const primaryValue = styles[0].cascadedValue;
  let primaryItems: StyleValue[] = [];
  if (primaryValue.type === "var") {
    const reparsed = reparseComputedValue(styles[0]);
    if (isRepeatedValue(reparsed)) {
      primaryItems = repeatUntil([primaryValue], reparsed.value.length);
    }
  }
  if (isRepeatedValue(primaryValue)) {
    primaryItems = primaryValue.value;
  }

  const sortableItems = useMemo(
    () =>
      Array.from(Array(primaryItems.length), (_, index) => ({
        id: String(index),
        index,
      })),
    [primaryItems.length]
  );

  const { dragItemId, placementIndicator, sortableRefCallback } = useSortable({
    items: sortableItems,
    onSort: (newIndex, oldIndex) =>
      swapRepeatedStyleItems(styles, oldIndex, newIndex),
  });

  if (primaryItems.length === 0) {
    return;
  }

  return (
    <CssValueListArrowFocus dragItemId={dragItemId}>
      <Flex direction="column" ref={sortableRefCallback}>
        {primaryItems.map((primaryItem, index) => {
          const id = String(index);
          const { label: itemLabel, color: itemColor } = getItemProps(
            index,
            primaryItem
          );
          const isHidden = isItemHidden(styles[0].cascadedValue, index);
          const canBeChanged =
            styles[0].cascadedValue.type === "var" ? index === 0 : true;
          return (
            <FloatingPanel
              key={index}
              title={label}
              content={renderItemContent(index, primaryItem)}
              offset={floatingPanelOffset}
            >
              <CssValueListItem
                id={id}
                draggable
                active={dragItemId === id}
                index={index}
                label={<Label truncate>{itemLabel}</Label>}
                hidden={isHidden}
                thumbnail={
                  renderThumbnail?.(index, primaryItem) ??
                  (itemColor && <ColorThumb color={itemColor} />)
                }
                buttons={
                  <>
                    <SmallToggleButton
                      variant="normal"
                      pressed={isHidden}
                      disabled={false === canBeChanged}
                      tabIndex={-1}
                      icon={isHidden ? <EyeClosedIcon /> : <EyeOpenIcon />}
                      onPressedChange={() =>
                        toggleRepeatedStyleItem(styles, index)
                      }
                    />
                    <SmallIconButton
                      variant="destructive"
                      disabled={false === canBeChanged}
                      tabIndex={-1}
                      icon={<MinusIcon />}
                      onClick={() => deleteRepeatedStyleItem(styles, index)}
                    />
                  </>
                }
              />
            </FloatingPanel>
          );
        })}
        {placementIndicator}
      </Flex>
    </CssValueListArrowFocus>
  );
};
