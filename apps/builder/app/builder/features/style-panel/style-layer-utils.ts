import type {
  InvalidValue,
  LayersValue,
  StyleProperty,
  TupleValue,
} from "@webstudio-is/css-engine";
import type { SectionProps } from "./sections";
import type { StyleInfo } from "./shared/style-info";
import type {
  CreateBatchUpdate,
  StyleUpdateOptions,
} from "./shared/use-style-data";

export const deleteLayer = <Layers extends TupleValue | LayersValue>(
  property: StyleProperty,
  index: number,
  layers: Layers,
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

  if (newLayers.length === 0) {
    batch.deleteProperty(property);
  } else {
    batch.setProperty(property)(propertyValue);
  }

  batch.publish();
};

export const hideLayer = <Layers extends LayersValue | TupleValue>(
  property: StyleProperty,
  index: number,
  layers: Layers,
  createBatchUpdate: SectionProps["createBatchUpdate"]
) => {
  if (layers.type !== "layers" && layers.type !== "tuple") {
    return;
  }

  const newLayersValue = layers.value.map((layer, layerIndex) => {
    if (layerIndex !== index) {
      return layer;
    }

    if (layer.type === "function" || layer.type === "tuple") {
      return {
        ...layer,
        hidden: layer.hidden ? false : true,
      } as Layers["value"][number];
    }
  });

  const newLayers: Layers = JSON.parse(JSON.stringify(layers));
  newLayers.value = newLayersValue as Layers["value"];

  const batch = createBatchUpdate();
  batch.setProperty(property)(newLayers);
  batch.publish();
};

export const addLayer = <Layers extends LayersValue | TupleValue>(
  property: StyleProperty,
  value: Layers | InvalidValue,
  style: StyleInfo,
  createBatchUpdate: SectionProps["createBatchUpdate"]
) => {
  if (
    value.type === "invalid" ||
    (value.type !== "layers" && value.type !== "tuple")
  ) {
    return;
  }

  const existingValues = style[property]?.value;
  if (existingValues?.type === "layers") {
    value.value = [...value.value, ...existingValues.value] as Layers["value"];
  }

  // Transitions come's with a default property of tuple. Which needs to be overwritten
  // Because, we handle transitions, box-shadow and text-shadows etc using layers in the project.
  // So, we merge the values of the new layer with the existing layer is tuple and the property is filter or backdropFilter
  if (
    (property === "filter" || property === "backdropFilter") &&
    existingValues?.type === "tuple"
  ) {
    value.value = [
      ...value.value,
      ...(existingValues?.value || []),
    ] as Layers["value"];
  }

  const batch = createBatchUpdate();
  batch.setProperty(property)(value);
  batch.publish();
};

export const updateLayer = <Layers extends LayersValue | TupleValue>(
  property: StyleProperty,
  newValue: Layers,
  oldValue: Layers,
  index: number,
  createBatchUpdate: SectionProps["createBatchUpdate"],
  options: StyleUpdateOptions
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
  batch.publish(options);
};

export const getLayerCount = (property: StyleProperty, style: StyleInfo) => {
  const value = style[property]?.value;
  const existingValue =
    value?.type === "layers" || value?.type === "tuple" ? value : undefined;
  return existingValue?.value.length ?? 0;
};

export const getValue = (property: StyleProperty, style: StyleInfo) => {
  const value = style[property]?.value;
  return (value?.type === "layers" || value?.type === "tuple") &&
    value.value.length > 0
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
