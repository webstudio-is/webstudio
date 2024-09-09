import { useMemo } from "react";
import type { RgbaColor } from "colord";
import type {
  LayersValue,
  StyleProperty,
  StyleValue,
} from "@webstudio-is/css-engine";
import {
  EyeconClosedIcon,
  EyeconOpenIcon,
  SubtractIcon,
} from "@webstudio-is/icons";
import {
  CssValueListArrowFocus,
  CssValueListItem,
  Flex,
  Label,
  SmallIconButton,
  SmallToggleButton,
  useSortable,
} from "@webstudio-is/design-system";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { repeatUntil } from "~/shared/array-utils";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { createBatchUpdate, type StyleUpdateOptions } from "./use-style-data";
import { ColorThumb } from "./color-thumb";

const normalizeStyleValue = (
  value: undefined | StyleValue,
  primaryValue: StyleValue
): LayersValue => {
  const primaryLayersCount =
    primaryValue.type === "layers" ? primaryValue.value.length : 0;
  const layers = value?.type === "layers" ? value.value : [];
  const normalizedLayers: LayersValue = {
    type: "layers",
    value: repeatUntil(layers, primaryLayersCount),
  };
  return normalizedLayers;
};

export const addRepeatedStyleItem = (
  styles: ComputedStyleDecl[],
  newItems: Map<StyleProperty, StyleValue>
) => {
  const batch = createBatchUpdate();
  const currentStyles = new Map(
    styles.map((styleDecl) => [styleDecl.property, styleDecl.cascadedValue])
  );
  const primaryValue = styles[0].cascadedValue;
  for (const [property, value] of newItems) {
    const currentValue = currentStyles.get(property);
    const normalizedValue = normalizeStyleValue(currentValue, primaryValue);
    const newLayers = value.type === "layers" ? value.value : [];
    batch.setProperty(property)({
      type: "layers",
      value: [...normalizedValue.value, ...newLayers],
    });
  }
  batch.publish();
};

export const editRepeatedStyleItem = (
  styles: ComputedStyleDecl[],
  index: number,
  newItems: Map<StyleProperty, StyleValue>,
  options?: StyleUpdateOptions
) => {
  const batch = createBatchUpdate();
  const currentStyles = new Map(
    styles.map((styleDecl) => [styleDecl.property, styleDecl.cascadedValue])
  );
  const primaryValue = styles[0].cascadedValue;
  for (const [property, value] of newItems) {
    const currentValue = currentStyles.get(property);
    const normalizedValue = normalizeStyleValue(currentValue, primaryValue);
    const newLayers = value.type === "layers" ? value.value : [];
    normalizedValue.value.splice(index, 1, ...newLayers);
    batch.setProperty(property)({
      type: "layers",
      value: normalizedValue.value,
    });
  }
  batch.publish(options);
};

const createLayersTransformer =
  (styles: ComputedStyleDecl[]) =>
  (
    transform: (property: string, value: LayersValue) => Partial<LayersValue>
  ) => {
    const batch = createBatchUpdate();
    const primaryValue = styles[0].cascadedValue;
    for (const styleDecl of styles) {
      const value = styleDecl.cascadedValue;
      const normalizedValue = normalizeStyleValue(value, primaryValue);
      const newLayers: LayersValue = {
        ...normalizedValue,
        ...transform(styleDecl.property, normalizedValue),
      };
      // delete empty layers
      if (newLayers.value.length === 0) {
        batch.deleteProperty(styleDecl.property as StyleProperty);
      } else {
        batch.setProperty(styleDecl.property as StyleProperty)(newLayers);
      }
    }
    batch.publish();
  };

const hideLayer = (value: LayersValue, layerIndex: number) => ({
  value: value.value.map((item, index) =>
    index === layerIndex
      ? { ...item, hidden: false === (item.hidden ?? false) }
      : item
  ),
});

const deleteLayer = (value: LayersValue, layerIndex: number) => ({
  value: value.value.filter((_item, index) => index !== layerIndex),
});

const swapLayers = (value: LayersValue, oldIndex: number, newIndex: number) => {
  const newValue = Array.from(value.value);
  // You can swap only if there are at least two layers
  // As we are checking across multiple properties, we can't be sure
  // which property don't have two layers so we are checking here.
  if (value.value.length >= 2) {
    newValue.splice(oldIndex, 1);
    newValue.splice(newIndex, 0, value.value[oldIndex]);
  }
  return {
    value: newValue,
  };
};

export const RepeatedStyle = (props: {
  label: string;
  styles: ComputedStyleDecl[];
  getItemProps: (
    index: number,
    primaryValue: StyleValue
  ) => { label: string; color?: RgbaColor };
  renderItemContent: (index: number, primaryValue: StyleValue) => JSX.Element;
}) => {
  const transformLayers = createLayersTransformer(props.styles);
  const { label, styles, getItemProps, renderItemContent } = props;
  // first property should describe the amount of layers
  const layers = styles[0].cascadedValue;
  const primaryValues = layers?.type === "layers" ? layers.value : [];

  const sortableItems = useMemo(
    () =>
      Array.from(Array(primaryValues.length), (_, index) => ({
        id: String(index),
        index,
      })),
    [primaryValues.length]
  );

  const { dragItemId, placementIndicator, sortableRefCallback } = useSortable({
    items: sortableItems,
    onSort: (newIndex, oldIndex) =>
      transformLayers((_property, value) =>
        swapLayers(value, oldIndex, newIndex)
      ),
  });

  if (primaryValues.length === 0) {
    return;
  }

  return (
    <CssValueListArrowFocus dragItemId={dragItemId}>
      <Flex direction="column" ref={sortableRefCallback}>
        {primaryValues.map((primaryValue, index) => {
          const id = String(index);
          const { label: itemLabel, color: itemColor } = getItemProps(
            index,
            primaryValue
          );
          return (
            <FloatingPanel
              key={index}
              title={label}
              content={renderItemContent(index, primaryValue)}
            >
              <CssValueListItem
                id={id}
                draggable={true}
                active={dragItemId === id}
                index={index}
                label={<Label truncate>{itemLabel}</Label>}
                hidden={primaryValue.hidden}
                thumbnail={itemColor && <ColorThumb color={itemColor} />}
                buttons={
                  <>
                    <SmallToggleButton
                      variant="normal"
                      pressed={primaryValue.hidden}
                      disabled={false}
                      tabIndex={-1}
                      onPressedChange={() =>
                        transformLayers((_property, value) =>
                          hideLayer(value, index)
                        )
                      }
                      icon={
                        primaryValue.hidden ? (
                          <EyeconClosedIcon />
                        ) : (
                          <EyeconOpenIcon />
                        )
                      }
                    />
                    <SmallIconButton
                      variant="destructive"
                      tabIndex={-1}
                      icon={<SubtractIcon />}
                      onClick={() =>
                        transformLayers((_property, value) =>
                          deleteLayer(value, index)
                        )
                      }
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
