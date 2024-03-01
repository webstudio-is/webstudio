import type {
  InvalidValue,
  LayersValue,
  StyleProperty,
  TupleValue,
} from "@webstudio-is/css-engine";
import type { RenderCategoryProps } from "./style-sections";
import type { StyleInfo } from "./shared/style-info";
import type { CreateBatchUpdate } from "./shared/use-style-data";

const isLayersValue = (
  layers: LayersValue | TupleValue
): layers is LayersValue => {
  return layers.type === "layers";
};

export const deleteLayer = (
  property: StyleProperty,
  index: number,
  layers: LayersValue | TupleValue,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  const batch = createBatchUpdate();
  if (layers.value.length === 1) {
    batch.deleteProperty(property);
  }

  let newLayers: LayersValue | TupleValue;
  if (isLayersValue(layers)) {
    newLayers = { type: "layers", value: [...layers.value] };
  } else {
    newLayers = { type: "tuple", value: [...layers.value] };
  }
  newLayers.value.splice(index, 1);

  batch.setProperty(property)(newLayers);
  batch.publish();
};

export const hideLayer = (
  property: StyleProperty,
  index: number,
  layers: LayersValue | TupleValue,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  // We don't want to hide the tuple itself
  // We can only hide a individual layer and not single instance of a tuple
  if (layers.type === "tuple") {
    return;
  }

  const layer = layers.value[index];
  if (layer.type !== "tuple" && layer.type !== "unparsed") {
    return;
  }

  const batch = createBatchUpdate();
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
  layerValue: LayersValue | TupleValue | InvalidValue,
  style: StyleInfo,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  if (layerValue.type === "invalid") {
    return;
  }
  const layers = style[property]?.value;
  const batch = createBatchUpdate();

  // Initially its none, so we can just set it.
  if (layers?.type === "layers" && layerValue.type === "layers") {
    // Adding layers we had before
    layerValue.value = [...layerValue.value, ...layers.value];
  }

  if (layers?.type === "tuple" && layerValue.type === "tuple") {
    layerValue.value = [...layerValue.value, ...layers.value];
  }

  batch.setProperty(property)(layerValue);
  batch.publish();
};

export const updateLayer = (
  property: StyleProperty,
  newValue: LayersValue | TupleValue,
  layers: LayersValue | TupleValue,
  index: number,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  const batch = createBatchUpdate();
  const layer = layers.value[index];
  if (layer.type === "unparsed") {
    return;
  }

  let newLayers: LayersValue | TupleValue;
  if (isLayersValue(layers) && isLayersValue(newValue)) {
    newLayers = { type: "layers", value: [...layers.value] };
    newLayers.value.splice(index, 1, ...newValue.value);
    batch.setProperty(property)(newLayers);
  }

  if (newValue.type === "tuple" && layers.type === "tuple") {
    newLayers = { type: "tuple", value: [...layers.value] };
    newLayers.value.splice(index, 1, ...newValue.value);
    batch.setProperty(property)(newLayers);
  }

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
