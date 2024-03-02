import {
  TupleValue,
  type InvalidValue,
  type LayersValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import type { RenderCategoryProps } from "./style-sections";
import type { StyleInfo } from "./shared/style-info";
import type { CreateBatchUpdate } from "./shared/use-style-data";

export const deleteLayer = (
  property: StyleProperty,
  index: number,
  layers: LayersValue | TupleValue,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  let newLayers: LayersValue | TupleValue;
  if (layers.type === "layers") {
    newLayers = { type: "layers", value: [...layers.value] };
  } else {
    newLayers = { type: "tuple", value: [...layers.value] };
  }
  newLayers.value.splice(index, 1);
  const batch = createBatchUpdate();

  if (newLayers.value.length === 0) {
    batch.deleteProperty(property);
  } else {
    batch.setProperty(property)(newLayers);
  }

  batch.publish();
};

export const hideLayer = (
  property: StyleProperty,
  index: number,
  layers: LayersValue | TupleValue,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
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
  const value = layers.value[index];
  if (value.type === "unparsed") {
    return;
  }

  if (
    (layers.type === "layers" && newValue.type === "layers") ||
    (layers.type === "tuple" && newValue.type === "tuple")
  ) {
    const newLayers = { type: layers.type, value: [...layers.value] };
    newLayers.value.splice(index, 1, ...newValue.value);

    const batch = createBatchUpdate();
    batch.setProperty(property)(newLayers as LayersValue | TupleValue);
    batch.publish();
  }
};

export const getLayerCount = (
  property: StyleProperty,
  style: StyleInfo
): number => {
  const value = style[property]?.value;
  return value?.type === "layers" || value?.type === "tuple"
    ? value.value.length
    : 0;
};

export const getValue = (
  property: StyleProperty,
  style: StyleInfo
): TupleValue | LayersValue | undefined => {
  const value = style[property]?.value;
  return value?.type === "layers" ||
    (value?.type === "tuple" && value.value.length > 0)
    ? value
    : undefined;
};

export const swapLayers = (
  property: StyleProperty,
  newIndex: number,
  oldIndex: number,
  style: StyleInfo,
  createBatchUpdate: CreateBatchUpdate
) => {
  const value = getValue(property, style);

  if (value === undefined) {
    return;
  }

  if (value.type !== "layers" && value.type !== "tuple") {
    return;
  }

  const newLayers = {
    type: value.type,
    value: [...value.value],
  };
  newLayers.value.splice(oldIndex, 1);
  newLayers.value.splice(newIndex, 0, value.value[oldIndex]);
  const batch = createBatchUpdate();

  batch.setProperty(property)(newLayers as LayersValue | TupleValue);
  batch.publish();
};
