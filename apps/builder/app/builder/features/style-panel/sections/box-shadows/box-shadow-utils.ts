import { parseBoxShadow, type LayersValue } from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";
import type { StyleInfo } from "../../shared/style-info";
import type { CreateBatchUpdate } from "../../shared/use-style-data";

export const property = "boxShadow";

export const deleteLayer = (
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

export const addBoxShadow = (
  shadow: string,
  style: StyleInfo,
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"]
) => {
  const parsedLayers = parseBoxShadow(shadow);
  // Will never be invalid, just a TS guard.
  if (parsedLayers.type === "invalid") {
    return;
  }

  const layers = style[property]?.value;

  // Initially its none, so we can just set it.
  if (layers?.type === "layers") {
    // Adding layers we had before
    parsedLayers.value = [...parsedLayers.value, ...layers.value];
  }

  const batch = createBatchUpdate();
  batch.setProperty(property)(parsedLayers);
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

export const getLayerCount = (style: StyleInfo) => {
  const value = style[property]?.value;
  const layers = value?.type === "layers" ? value : undefined;
  return layers?.value.length ?? 0;
};

export const getValue = (style: StyleInfo) => {
  const value = style[property]?.value;
  return value?.type === "layers" && value.value.length > 0 ? value : undefined;
};

export const swapLayers = (
  newIndex: number,
  oldIndex: number,
  style: StyleInfo,
  createBatchUpdate: CreateBatchUpdate
) => {
  const batch = createBatchUpdate();
  const value = getValue(style);

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
