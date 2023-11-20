import type {
  InvalidValue,
  LayersValue,
  StyleProperty,
} from "@webstudio-is/css-engine";
import type { RenderCategoryProps } from "./style-sections";
import type { StyleInfo } from "./shared/style-info";
import type { CreateBatchUpdate } from "./shared/use-style-data";

export const deleteLayer = (
  property: StyleProperty,
  index: number,
  layers: LayersValue,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  const batch = createBatchUpdate();
  const layer = layers.value[index];

  if (layer.type !== "tuple" && layer.type !== "unparsed") {
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
  property: StyleProperty,
  index: number,
  layers: LayersValue,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  const batch = createBatchUpdate();
  const layer = layers.value[index];

  if (layer.type !== "tuple" && layer.type !== "unparsed") {
    return;
  }
  const newLayers = [...layers.value];
  newLayers.splice(index, 1, {
    ...layer,
    hidden: layer.hidden !== true,
  });
  batch.setProperty(property)({
    type: "layers",
    value: newLayers,
  });

  batch.publish();
};

export const addLayer = (
  property: StyleProperty,
  layerValue: LayersValue | InvalidValue,
  style: StyleInfo,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  if (layerValue.type === "invalid") {
    return;
  }

  const layers = style[property]?.value;

  // Initially its none, so we can just set it.
  if (layers?.type === "layers") {
    // Adding layers we had before
    layerValue.value = [...layerValue.value, ...layers.value];
  }

  const batch = createBatchUpdate();
  batch.setProperty(property)(layerValue);
  batch.publish();
};

export const updateLayer = (
  property: StyleProperty,
  newValue: LayersValue,
  layers: LayersValue,
  index: number,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  const batch = createBatchUpdate();
  const layer = layers.value[index];

  if (layer.type !== "tuple" && layer.type !== "unparsed") {
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

export const getLayerCount = (property: StyleProperty, style: StyleInfo) => {
  const value = style[property]?.value;
  const layers = value?.type === "layers" ? value : undefined;
  return layers?.value.length ?? 0;
};

export const getValue = (property: StyleProperty, style: StyleInfo) => {
  const value = style[property]?.value;
  return value?.type === "layers" && value.value.length > 0 ? value : undefined;
};

export const swapLayers = (
  property: StyleProperty,
  newIndex: number,
  oldIndex: number,
  style: StyleInfo,
  createBatchUpdate: CreateBatchUpdate
) => {
  const batch = createBatchUpdate();
  const value = getValue(property, style);

  if (value === undefined) {
    return;
  }

  const newValue = [...value.value];

  newValue.splice(oldIndex, 1);

  newValue.splice(newIndex, 0, value.value[oldIndex]);

  batch.setProperty(property)({
    ...value,
    value: newValue,
  });

  batch.publish();
};
