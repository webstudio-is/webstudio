import {
  type FunctionValue,
  type LayersValue,
  type StyleProperty,
  type TupleValue,
} from "@webstudio-is/css-engine";
import {
  CssValueListArrowFocus,
  CssValueListItem,
  Flex,
  Label,
  SmallIconButton,
  SmallToggleButton,
  useSortable,
} from "@webstudio-is/design-system";
import type { SectionProps } from "./sections";
import {
  deleteLayer,
  getLayerCount,
  hideLayer,
  swapLayers,
  updateLayer,
  getHumanizedTextFromLayer,
} from "./style-layer-utils";
import { useMemo } from "react";
import type {
  DeleteProperty,
  StyleUpdateOptions,
} from "./shared/use-style-data";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import {
  EyeconClosedIcon,
  EyeconOpenIcon,
  SubtractIcon,
} from "@webstudio-is/icons";
import { ColorThumb } from "./shared/color-thumb";

export type LayerListProperty = Extract<
  StyleProperty,
  | "filter"
  | "backdropFilter"
  | "textShadow"
  | "boxShadow"
  | "transitionProperty"
>;

type LayerListProps = SectionProps & {
  disabled?: boolean;
  label: string;
  property: LayerListProperty;
  value: TupleValue | LayersValue;
  deleteProperty: DeleteProperty;
  deleteLayer?: (index: number) => boolean | void;
  swapLayers?: (oldIndex: number, newIndex: number) => void;
  hideLayer?: (index: number) => void;
  renderContent: (props: {
    index: number;
    layer: TupleValue | FunctionValue;
    property: LayerListProperty;
    propertyValue: string;
    onDeleteLayer: (index: number) => void;
    onEditLayer: (
      index: number,
      layers: TupleValue | LayersValue,
      options: StyleUpdateOptions
    ) => void;
    deleteProperty: DeleteProperty;
  }) => JSX.Element;
};

export const LayersList = (props: LayerListProps) => {
  const {
    label,
    property,
    value,
    currentStyle,
    createBatchUpdate,
    renderContent,
    deleteProperty,
  } = props;
  const layersCount = getLayerCount(property, currentStyle);

  const sortableItems = useMemo(
    () =>
      Array.from(Array(layersCount), (_, index) => ({
        id: String(index),
        index,
      })),
    [layersCount]
  );

  const { dragItemId, placementIndicator, sortableRefCallback } = useSortable({
    items: sortableItems,
    onSort: (newIndex, oldIndex) =>
      props.swapLayers
        ? props.swapLayers(oldIndex, newIndex)
        : swapLayers(
            property,
            newIndex,
            oldIndex,
            currentStyle,
            createBatchUpdate
          ),
  });

  const handleDeleteLayer = (index: number) => {
    return props?.deleteLayer
      ? props.deleteLayer(index)
      : deleteLayer(property, index, value, createBatchUpdate);
  };

  const handleHideLayer = (index: number) => {
    return props?.hideLayer
      ? props.hideLayer(index)
      : hideLayer(property, index, value, createBatchUpdate);
  };

  const onEditLayer = (
    index: number,
    newLayers: TupleValue | LayersValue,
    options: StyleUpdateOptions
  ) => {
    return updateLayer(
      property,
      newLayers,
      value,
      index,
      createBatchUpdate,
      options
    );
  };

  return (
    <CssValueListArrowFocus dragItemId={dragItemId}>
      <Flex direction="column" ref={sortableRefCallback}>
        {value.value.map((layer, index) => {
          // Because we are using a tuple or function to represent the layers,
          // We use tuple for text-shadow and box-shadow properties
          // and function for filter and backdrop-filter property

          const isLayerATupleOrFunction =
            layer.type === "tuple" || layer.type === "function";

          if (isLayerATupleOrFunction === false) {
            return;
          }

          const id = String(index);
          const properties = getHumanizedTextFromLayer(property, layer);
          if (properties === undefined) {
            return;
          }

          return (
            <FloatingPanel
              key={index}
              title={label}
              content={renderContent({
                index,
                property,
                layer,
                onEditLayer,
                propertyValue: properties.value,
                onDeleteLayer: handleDeleteLayer,
                deleteProperty,
              })}
            >
              <CssValueListItem
                id={id}
                draggable={value.value.length > 1}
                active={dragItemId === id}
                index={index}
                label={<Label truncate>{properties.name}</Label>}
                hidden={
                  (layer.type === "tuple" || layer.type === "function") &&
                  layer?.hidden
                }
                thumbnail={
                  property === "textShadow" || property === "boxShadow" ? (
                    <ColorThumb color={properties.color} />
                  ) : undefined
                }
                buttons={
                  <>
                    {layer.type === "tuple" || layer.type === "function" ? (
                      <SmallToggleButton
                        variant="normal"
                        pressed={layer?.hidden}
                        disabled={false}
                        tabIndex={-1}
                        onPressedChange={() => handleHideLayer(index)}
                        icon={
                          layer?.hidden ? (
                            <EyeconClosedIcon />
                          ) : (
                            <EyeconOpenIcon />
                          )
                        }
                      />
                    ) : undefined}
                    <SmallIconButton
                      variant="destructive"
                      tabIndex={-1}
                      disabled={
                        (layer.type === "tuple" || layer.type === "function") &&
                        layer.hidden
                      }
                      icon={<SubtractIcon />}
                      onClick={() => handleDeleteLayer(index)}
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
