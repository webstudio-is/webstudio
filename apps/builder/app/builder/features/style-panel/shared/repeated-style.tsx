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
import type { StyleInfo } from "./style-info";
import type { CreateBatchUpdate } from "./use-style-data";
import { ColorThumb } from "./color-thumb";
import { repeatUntil } from "~/shared/array-utils";

const createLayersTransformer =
  ({
    properties,
    style,
    createBatchUpdate,
  }: {
    properties: StyleProperty[];
    style: StyleInfo;
    createBatchUpdate: CreateBatchUpdate;
  }) =>
  (transform: (value: LayersValue) => Partial<LayersValue>) => {
    const batch = createBatchUpdate();
    const primaryValue = style[properties[0]]?.value;
    const primaryLayersCount =
      primaryValue?.type === "layers" ? primaryValue.value.length : 0;
    for (const property of properties) {
      const value = style[property]?.value;
      if (value?.type === "layers") {
        const normalizedLayers: LayersValue = {
          type: "layers",
          value: repeatUntil(value.value, primaryLayersCount),
        };
        const newLayers: LayersValue = {
          ...normalizedLayers,
          ...transform(normalizedLayers),
        };
        // delete empty layers
        if (newLayers.value.length === 0) {
          batch.deleteProperty(property);
        } else {
          batch.setProperty(property)(newLayers);
        }
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
  properties: StyleProperty[];
  style: StyleInfo;
  createBatchUpdate: CreateBatchUpdate;
  getItemProps: (
    index: number,
    primaryValue: StyleValue
  ) => { label: string; color?: RgbaColor };
  renderItemContent: (index: number) => JSX.Element;
}) => {
  const transformLayers = createLayersTransformer(props);
  const { label, properties, style, getItemProps, renderItemContent } = props;
  // first property should describe the amount of layers
  const layers = style[properties[0]]?.value;
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
      transformLayers((value) => swapLayers(value, oldIndex, newIndex)),
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
              content={renderItemContent(index)}
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
                        transformLayers((value) => hideLayer(value, index))
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
                        transformLayers((value) => deleteLayer(value, index))
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
