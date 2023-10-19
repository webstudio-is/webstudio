import type { LayersValue, StyleProperty } from "@webstudio-is/css-engine";
import {
  CssValueListArrowFocus,
  Flex,
  useSortable,
} from "@webstudio-is/design-system";
import type { RenderCategoryProps } from "../../style-sections";
import { Layer } from "./box-shadow-layer";
import {
  deleteLayer,
  getLayerCount,
  hideLayer,
  swapLayers,
  updateLayer,
} from "../../style-layer-utils";
import { useMemo } from "react";

type BoxShadowLayerProperies = RenderCategoryProps & {
  layers: LayersValue;
};

const property: StyleProperty = "boxShadow";

export const BoxShadowLayers = ({
  layers,
  currentStyle,
  createBatchUpdate,
}: BoxShadowLayerProperies) => {
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
    return hideLayer(property, index, layers, createBatchUpdate);
  };

  const onEditLayer = (index: number, newLayers: LayersValue) => {
    return updateLayer(property, newLayers, layers, index, createBatchUpdate);
  };

  return (
    <CssValueListArrowFocus dragItemId={dragItemId}>
      <Flex direction="column" gap={2} ref={sortableRefCallback}>
        {layers.value.map((layer, index) => {
          if (layer.type !== "tuple") {
            return null;
          }
          const id = String(index);
          return (
            <Layer
              key={index}
              id={id}
              index={index}
              layer={layer}
              isHighlighted={dragItemId === id}
              onLayerHide={handleHideLayer}
              onDeleteLayer={handleDeleteLayer}
              createBatchUpdate={createBatchUpdate}
              onEditLayer={onEditLayer}
            />
          );
        })}
        {placementIndicator}
      </Flex>
    </CssValueListArrowFocus>
  );
};
