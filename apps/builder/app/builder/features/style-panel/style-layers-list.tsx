import type {
  LayersValue,
  StyleProperty,
  TupleValue,
} from "@webstudio-is/css-engine";
import {
  CssValueListArrowFocus,
  Flex,
  useSortable,
} from "@webstudio-is/design-system";
import type { SectionProps } from "./sections";
import {
  deleteLayer,
  getLayerCount,
  hideLayer,
  swapLayers,
  updateLayer,
} from "./style-layer-utils";
import { useMemo } from "react";
import type {
  CreateBatchUpdate,
  DeleteProperty,
} from "./shared/use-style-data";

export type LayerProps<LayerType> = {
  id: string;
  index: number;
  layer: LayerType;
  isHighlighted: boolean;
  disabled?: boolean;
  onLayerHide: (index: number) => void;
  onDeleteLayer: (index: number) => void;
  onEditLayer: (index: number, layers: LayersValue | TupleValue) => void;
  createBatchUpdate: CreateBatchUpdate;
  deleteProperty: DeleteProperty;
};

type LayerListProperties<LayerType, PropertyValueType> = SectionProps & {
  disabled?: boolean;
  property: StyleProperty;
  layers: PropertyValueType;
  renderLayer: (props: LayerProps<LayerType>) => JSX.Element;
};

export const LayersList = <
  LayerType,
  PropertyValueType extends TupleValue | LayersValue,
>({
  property,
  layers,
  disabled,
  currentStyle,
  renderLayer,
  createBatchUpdate,
  deleteProperty,
}: LayerListProperties<LayerType, PropertyValueType>) => {
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
    onSort: (newIndex, oldIndex) => {
      swapLayers(property, newIndex, oldIndex, currentStyle, createBatchUpdate);
    },
  });

  const handleDeleteLayer = (index: number) => {
    return deleteLayer(property, index, layers, createBatchUpdate);
  };

  const handleHideLayer = (index: number) => {
    if (layers.type === "tuple") {
      return;
    }
    return hideLayer(property, index, layers, createBatchUpdate);
  };

  const onEditLayer = (index: number, newLayers: PropertyValueType) => {
    return updateLayer<PropertyValueType>(
      property,
      newLayers,
      layers,
      index,
      createBatchUpdate
    );
  };

  return (
    <CssValueListArrowFocus dragItemId={dragItemId}>
      <Flex direction="column" ref={sortableRefCallback}>
        {layers.value.map((layer, index) => {
          if (layer.type !== "tuple" && layer.type !== "function") {
            return null;
          }
          const id = String(index);
          return renderLayer({
            id,
            index,
            layer,
            disabled,
            isHighlighted: dragItemId === id,
            onLayerHide: handleHideLayer,
            onDeleteLayer: handleDeleteLayer,
            createBatchUpdate,
            deleteProperty,
            onEditLayer,
          } as LayerProps<LayerType>);
        })}
        {placementIndicator}
      </Flex>
    </CssValueListArrowFocus>
  );
};
