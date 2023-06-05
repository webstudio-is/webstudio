import type { LayersValue } from "@webstudio-is/css-data";
import { Flex } from "@webstudio-is/design-system";
import type { RenderCategoryProps } from "../../style-sections";
import { Layer } from "./box-shadow-layer";
import { deleteLayer, hideLayer, updateBoxShadowLayer } from "./utils";

type BoxShadowLayerProperies = RenderCategoryProps & {
  layers: LayersValue;
};

export const BoxShadowLayersList = ({
  layers,
  createBatchUpdate,
}: BoxShadowLayerProperies) => {
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
    <Flex direction="column" gap={2}>
      {layers.value.map((layer, index) => {
        if (layer.type === "tuple") {
          return (
            <Layer
              key={index}
              index={index}
              layer={layer}
              onLayerHide={handleHideLayer}
              onDeleteLayer={handleDeleteLayer}
              createBatchUpdate={createBatchUpdate}
              onEditLayer={onEditLayer}
            />
          );
        }
        return null;
      })}
    </Flex>
  );
};
