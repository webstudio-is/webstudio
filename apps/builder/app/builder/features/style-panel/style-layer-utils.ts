import {
  KeywordValue,
  StyleValue,
  toValue,
  type FunctionValue,
  type InvalidValue,
  type LayersValue,
  type StyleProperty,
  type TupleValue,
} from "@webstudio-is/css-engine";
import type { SectionProps } from "./sections";
import type { StyleInfo } from "./shared/style-info";
import type {
  CreateBatchUpdate,
  StyleUpdateOptions,
} from "./shared/use-style-data";
import { colord, type RgbaColor } from "colord";
import { humanizeString } from "~/shared/string-utils";
import { isAnimatableProperty } from "@webstudio-is/css-data";
import { findTimingFunctionFromValue } from "./sections/transitions/transition-utils";
import type { LayerListProperty } from "./style-layers-list";

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

export const getHumanizedTextFromLayer = (
  property: LayerListProperty,
  layer: StyleValue
) => {
  switch (property) {
    case "transitionProperty":
      if (layer.type === "tuple") {
        const properties = [...layer.value];
        const transitionProperty = properties.find(
          (item): item is KeywordValue =>
            item.type === "keyword" && isAnimatableProperty(item.value) === true
        );

        const transitionTimingFunction = properties.find(
          (item): item is KeywordValue | FunctionValue =>
            (item.type === "keyword" || item.type === "function") &&
            isAnimatableProperty(toValue(item)) === false
        );

        if (transitionProperty === undefined) {
          throw `Transition property is missing from the layer ${JSON.stringify(layer)}`;
        }

        properties.splice(properties.indexOf(transitionProperty), 1);
        if (transitionTimingFunction !== undefined) {
          properties.splice(properties.indexOf(transitionTimingFunction), 1);
        }

        const customTimingFunction = findTimingFunctionFromValue(
          toValue(transitionTimingFunction)
        );

        return {
          name: `${humanizeString(transitionProperty.value)}: ${toValue({ type: "tuple", value: properties })} ${customTimingFunction ?? toValue(transitionTimingFunction)}`,
          value: toValue(layer),
          color: undefined,
        };
      }
      break;

    case "textShadow":
    case "boxShadow":
      if (layer.type === "tuple") {
        const name = [];
        let color: RgbaColor | undefined;
        const properties = [...layer.value];

        if (property === "boxShadow") {
          const insetKeyword = layer.value.find(
            (item) => item.type === "keyword" && item.value === "inset"
          );
          if (insetKeyword !== undefined) {
            name.push("Inner Shadow: ");
            properties.splice(properties.indexOf(insetKeyword), 1);
          } else {
            name.push("Outer Shadow: ");
          }
        }

        if (property === "textShadow") {
          name.push("Text Shadow: ");
        }

        for (const item of properties) {
          if (item.type === "unit") {
            const value = toValue(item);
            name.push(value);
          }

          if (item.type === "rgb") {
            color = colord(toValue(item)).toRgb();
          }

          if (item.type === "keyword") {
            if (colord(item.value).isValid() === false) {
              name.push(item.value);
            } else {
              color = colord(item.value).toRgb();
            }
          }

          if (item.type === "unparsed") {
            name.push(item.value);
          }

          if (item.type === "function") {
            const value = `${item.name}(${toValue(item.args)})`;
            name.push(value);
          }
        }

        return { name: name.join(" "), value: toValue(layer), color };
      }
      break;
    case "filter":
    case "backdropFilter":
      if (layer.type === "function") {
        const name = `${humanizeString(layer.name)}: ${toValue(layer.args)}`;
        const value = `${layer.name}(${toValue(layer.args)})`;
        return { name, value, color: undefined };
      }
  }
};
