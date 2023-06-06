import type {
  LayerValueItem,
  LayersValue,
  StyleProperty,
  TupleValue,
  UnparsedValue,
} from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";

export const property: StyleProperty = "boxShadow";

const isValidBoxShadowValue = (layer: LayerValueItem) =>
  layer.type === "tuple" || layer.type === "unparsed";

export const deleteLayer = (
  index: number,
  layers: LayersValue,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  const batch = createBatchUpdate();
  const layer = layers.value[index];

  if (isValidBoxShadowValue(layer) === false) {
    return;
  }
  const newLayers = [...layers.value];
  newLayers.splice(index, 1);

  if (newLayers.length === 0) {
    batch.deleteProperty(property);
  } else {
    batch.setProperty(property)({
      type: "layers",
      value: newLayers,
    });
  }

  batch.publish();
};

export const hideLayer = (
  index: number,
  layers: LayersValue,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  const batch = createBatchUpdate();
  const layer = layers.value[index];

  if (isValidBoxShadowValue(layer) === false) {
    return;
  }
  const newLayers = [...layers.value];
  newLayers.splice(index, 1, {
    ...(layer as TupleValue | UnparsedValue),
    hidden: !(layer as TupleValue | UnparsedValue)?.hidden,
  });
  batch.setProperty(property)({
    type: "layers",
    value: newLayers,
  });

  batch.publish();
};

export const addBoxShadow = (
  layers: LayersValue,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  const batch = createBatchUpdate();
  batch.setProperty(property)(layers);
  batch.publish();
};

export const updateBoxShadowLayer = (
  newValue: LayersValue,
  layers: LayersValue,
  index: number,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  const batch = createBatchUpdate();
  const layer = layers.value[index];

  if (isValidBoxShadowValue(layer) === false) {
    return;
  }
  const newLayers = [...layers.value];
  newLayers.splice(index, 1, ...newValue.value);
  batch.setProperty(property)({
    type: "layers",
    value: newLayers,
  });

  batch.publish();
};
