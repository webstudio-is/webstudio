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
import type { RenderCategoryProps } from "./style-sections";
import {
  deleteLayer,
  getLayerCount,
  hideLayer,
  swapLayers,
  updateLayer,
} from "./style-layer-utils";
import { useMemo } from "react";
import type { CreateBatchUpdate } from "./shared/use-style-data";

type LayerListProperties = RenderCategoryProps & {
  layers: LayersValue;
  renderLayer: (props: {
    id: string;
    index: number;
    layer: TupleValue;
    isHighlighted: boolean;
    onLayerHide: (index: number) => void;
    onDeleteLayer: (index: number) => void;
    createBatchUpdate: CreateBatchUpdate;
    onEditLayer: (index: number, newLayers: LayersValue) => void;
  }) => JSX.Element;
};

const property: StyleProperty = "boxShadow";

export const LayersList = ({
  layers,
  currentStyle,
  renderLayer,
  createBatchUpdate,
}: LayerListProperties) => {
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
          return renderLayer({
            id,
            index,
            layer,
            isHighlighted: dragItemId === id,
            onLayerHide: handleHideLayer,
            onDeleteLayer: handleDeleteLayer,
            createBatchUpdate,
            onEditLayer,
          });
        })}
        {placementIndicator}
      </Flex>
    </CssValueListArrowFocus>
  );
};
