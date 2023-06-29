import type { LayersValue } from "@webstudio-is/css-data";
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
  updateBoxShadowLayer,
} from "./box-shadow-utils";
import { useMemo } from "react";

type BoxShadowLayerProperies = RenderCategoryProps & {
  layers: LayersValue;
};

export const BoxShadowLayers = ({
  layers,
  currentStyle,
  createBatchUpdate,
}: BoxShadowLayerProperies) => {
  const layersCount = getLayerCount(currentStyle);

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
      swapLayers(newIndex, oldIndex, currentStyle, createBatchUpdate);
    },
  });

  const handleDeleteLayer = (index: number) => {
    return deleteLayer(index, layers, createBatchUpdate);
  };

  const handleHideLayer = (index: number) => {
    return hideLayer(index, layers, createBatchUpdate);
  };

  const onEditLayer = (index: number, newLayers: LayersValue) => {
    return updateBoxShadowLayer(newLayers, layers, index, createBatchUpdate);
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
