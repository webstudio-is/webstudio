import type {
  InvalidValue,
  LayersValue,
  StyleProperty,
  TupleValue,
} from "@webstudio-is/css-engine";
import type { SectionProps } from "./sections";
import type { StyleInfo } from "./shared/style-info";
import type { CreateBatchUpdate } from "./shared/use-style-data";

const isLayersOrTuppleValue = (
  value: TupleValue | LayersValue
): value is LayersValue | TupleValue => {
  return value.type === "layers" || value.type === "tuple";
};

export const deleteLayer = <T extends TupleValue | LayersValue>(
  property: StyleProperty,
  index: number,
  layers: T,
  createBatchUpdate: SectionProps["createBatchUpdate"]
) => {
  const batch = createBatchUpdate();
  const newLayers = [...layers.value];
  newLayers.splice(index, 1);

  const propertyValue: LayersValue | TupleValue =
    layers.type === "tuple"
      ? {
          type: "tuple",
          value: newLayers as TupleValue["value"],
        }
      : {
          type: "layers",
          value: newLayers as LayersValue["value"],
        };

  if (isLayersOrTuppleValue(propertyValue) === false) {
    return;
  }

  if (newLayers.length === 0) {
    batch.deleteProperty(property);
  } else {
    batch.setProperty(property)(propertyValue);
  }

  batch.publish();
};

export const hideLayer = (
  property: StyleProperty,
  index: number,
  layers: LayersValue,
  createBatchUpdate: SectionProps["createBatchUpdate"]
) => {
  const batch = createBatchUpdate();
  const value = layers.value[index];

  if (value.type !== "tuple" && value.type !== "unparsed") {
    return;
  }
  const newLayers = [...layers.value];
  newLayers.splice(index, 1, {
    ...value,
    hidden: value.hidden !== true,
  });
  batch.setProperty(property)({
    type: "layers",
    value: newLayers,
  });

  batch.publish();
};

export const addLayer = <T extends LayersValue | TupleValue>(
  property: StyleProperty,
  value: T | InvalidValue,
  style: StyleInfo,
  createBatchUpdate: SectionProps["createBatchUpdate"]
) => {
  if (
    value.type === "invalid" ||
    (value.type !== "layers" && value.type !== "tuple")
  ) {
    return;
  }

  const existingValues = getValue(property, style);
  if (existingValues?.type === "layers" || existingValues?.type === "tuple") {
    // Adding layers we had before
    value.value = [...value.value, ...existingValues.value] as T["value"];
  }

  const batch = createBatchUpdate();
  batch.setProperty(property)(value);
  batch.publish();
};

export const updateLayer = <T extends LayersValue | TupleValue>(
  property: StyleProperty,
  newValue: T,
  oldValue: T,
  index: number,
  createBatchUpdate: SectionProps["createBatchUpdate"]
) => {
  const batch = createBatchUpdate();
  const newLayers = [...oldValue.value];
  newLayers.splice(index, 1, ...newValue.value);

  const newPropertyValue: TupleValue | LayersValue =
    oldValue.type === "tuple"
      ? {
          type: "tuple",
          value: newLayers as TupleValue["value"],
        }
      : {
          type: "layers",
          value: newLayers as LayersValue["value"],
        };

  batch.setProperty(property)(newPropertyValue);
  batch.publish();
};

export const getLayerCount = (property: StyleProperty, style: StyleInfo) => {
  const value = style[property]?.value;
  const existingValue =
    value?.type === "layers" || value?.type === "tuple" ? value : undefined;
  return existingValue?.value.length ?? 0;
};

export const getValue = (property: StyleProperty, style: StyleInfo) => {
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
  const batch = createBatchUpdate();
  const value = getValue(property, style);

  if (value === undefined) {
    return;
  }

  const newValue = [...value.value];
  newValue.splice(oldIndex, 1);
  newValue.splice(newIndex, 0, value.value[oldIndex]);

  batch.setProperty(property)(
    value.type === "tuple"
      ? {
          type: "tuple",
          value: newValue as TupleValue["value"],
        }
      : {
          type: "layers",
          value: newValue as LayersValue["value"],
        }
  );
  batch.publish();
};
