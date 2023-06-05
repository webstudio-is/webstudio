import type { LayersValue, StyleProperty } from "@webstudio-is/css-data";
import { Flex } from "@webstudio-is/design-system";
import type { RenderCategoryProps } from "../../style-sections";
import { Layer } from "./box-shadow-layer";

type BoxShadowLayerProperies = RenderCategoryProps & {
  layers: LayersValue;
  property: StyleProperty;
};

export const BoxShadowLayersList: React.FC<BoxShadowLayerProperies> = ({
  property,
  layers,
  createBatchUpdate,
}) => {
  const handleDeleteLayer = (index: number) => {
    const batch = createBatchUpdate();
    const layer = layers.value[index];

    const canLayerBeHidden =
      layer.type === "tuple" || layer.type === "unparsed";
    if (!canLayerBeHidden) {
      return;
    }
    const newLayers = [...layers.value];
    newLayers.splice(index, 1);
    batch.setProperty(property)({
      type: "layers",
      value: newLayers,
    });

    batch.publish();
  };

  const handleHideLayer = (index: number) => {
    const batch = createBatchUpdate();
    const layer = layers.value[index];

    const canLayerBeHidden =
      layer.type === "tuple" || layer.type === "unparsed";
    if (canLayerBeHidden === false) {
      return;
    }
    const newLayers = [...layers.value];
    newLayers.splice(index, 1, { ...layer, hidden: !layer?.hidden });
    batch.setProperty(property)({
      type: "layers",
      value: newLayers,
    });

    batch.publish();
  };

  return (
    <Flex direction="column" gap={2}>
      {layers.value.map((layer, index) => {
        if (layer.type === "tuple") {
          return (
            <Layer
              key={index}
              index={index}
              property={property}
              layer={layer}
              onLayerHide={handleHideLayer}
              onDeleteLayer={handleDeleteLayer}
            />
          );
        }
        return null;
      })}
    </Flex>
  );
};
