import type { LayersValue, StyleValue } from "@webstudio-is/css-data";
import {
  type StyleInfo,
  type StyleValueInfo,
  getStyleSource,
} from "../../shared/style-info";
import type {
  CreateBatchUpdate,
  DeleteProperty,
  StyleUpdateOptions,
} from "../../shared/use-style-data";

export const layeredBackgroundPropsDefaults = {
  backgroundAttachment: { type: "keyword", value: "scroll" },
  backgroundClip: { type: "keyword", value: "border-box" },
  backgroundBlendMode: { type: "keyword", value: "normal" },
  backgroundImage: { type: "keyword", value: "none" },
  backgroundOrigin: { type: "keyword", value: "padding-box" },
  backgroundPosition: { type: "unit", value: 0, unit: "%" },
  backgroundRepeat: { type: "keyword", value: "repeat" },
  backgroundSize: { type: "keyword", value: "auto" },
} as const satisfies Record<string, BackgroundStyleValue>;

export type BackgroundStyleValue = LayersValue | LayersValue["value"][number];

export const isBackgroundStyleValue = (
  style: StyleValue
): style is BackgroundStyleValue => {
  if (
    style.type === "unit" ||
    style.type === "keyword" ||
    style.type === "unparsed" ||
    style.type === "image" ||
    style.type === "tuple" ||
    style.type === "invalid" ||
    style.type === "layers"
  ) {
    return true;
  }
  return false;
};

export const layeredBackgroundProps = Object.keys(
  layeredBackgroundPropsDefaults
) as (keyof typeof layeredBackgroundPropsDefaults)[];

export type LayeredBackgroundProperty = (typeof layeredBackgroundProps)[number];

export const isBackgroundLayeredProperty = (
  prop: string
): prop is LayeredBackgroundProperty => {
  return layeredBackgroundProps.includes(prop as LayeredBackgroundProperty);
};

const getPropertyLayerCount = (style: StyleValueInfo) => {
  if (style.value.type === "layers") {
    return style.value.value.length;
  }
  return 0;
};

export const getLayerCount = (style: StyleInfo) => {
  return Math.max(
    ...layeredBackgroundProps.map((prop) => {
      const styleValue = style[prop];

      if (styleValue !== undefined) {
        return getPropertyLayerCount(styleValue);
      }

      return 0;
    })
  );
};

export const getLayerBackgroundStyleInfo = (
  layerNum: number,
  style: StyleInfo
): StyleInfo => {
  const layerCount = getLayerCount(style);
  if (layerNum >= layerCount) {
    throw new Error(`${layerNum} is out of bounds`);
  }

  const result: StyleInfo = {};

  for (const [property, value] of Object.entries(
    layeredBackgroundPropsDefaults
  )) {
    result[property as LayeredBackgroundProperty] = { value };
  }

  for (const property of layeredBackgroundProps) {
    const resultProperty = result[property];
    if (resultProperty === undefined) {
      throw new Error(`Property ${property} is not defined`);
    }

    const styleValue = style[property];

    const valueStyle = styleValue?.value;
    const localStyle = styleValue?.local;
    const cascadedStyle = styleValue?.cascaded;
    const previousSourceStyle = styleValue?.previousSource;
    const nextSourceStyle = styleValue?.nextSource;

    if (valueStyle?.type === "layers") {
      const styleValue = valueStyle.value[layerNum];
      resultProperty["value"] = styleValue;
    }

    if (localStyle?.type === "layers") {
      const styleValue = localStyle.value[layerNum];
      resultProperty["local"] = styleValue;
    }

    if (previousSourceStyle?.value?.type === "layers") {
      const styleValue = previousSourceStyle.value.value[layerNum];
      resultProperty["previousSource"] = {
        styleSourceId: previousSourceStyle.styleSourceId,
        value: styleValue,
      };
    }

    if (nextSourceStyle?.value?.type === "layers") {
      const styleValue = nextSourceStyle.value.value[layerNum];
      resultProperty["nextSource"] = {
        styleSourceId: nextSourceStyle.styleSourceId,
        value: styleValue,
      };
    }

    if (cascadedStyle?.value.type === "layers") {
      const styleValue = cascadedStyle.value.value[layerNum];
      resultProperty["cascaded"] = {
        breakpointId: cascadedStyle.breakpointId,
        value: styleValue,
      };
    }
  }

  return result;
};

export type DeleteBackgroundProperty = ReturnType<typeof deleteLayerProperty>;

export const deleteLayerProperty =
  (
    layerNum: number,
    style: StyleInfo,
    deleteProperty: DeleteProperty,
    createBatchUpdate: CreateBatchUpdate
  ) =>
  (propertyName: LayeredBackgroundProperty, options?: StyleUpdateOptions) => {
    if (options?.isEphemeral) {
      deleteProperty(propertyName, options);
      return;
    }

    setLayerProperty(layerNum, style, createBatchUpdate)(propertyName)(
      layeredBackgroundPropsDefaults[propertyName]
    );
  };

export type SetBackgroundProperty = ReturnType<typeof setLayerProperty>;

const getLayersValue = (styleValue?: StyleValueInfo) => {
  const clonedStyleValue: StyleValueInfo | undefined =
    structuredClone(styleValue);
  if (clonedStyleValue?.local?.type === "layers") {
    return clonedStyleValue.local;
  }

  if (clonedStyleValue?.nextSource?.value?.type === "layers") {
    return clonedStyleValue?.nextSource?.value;
  }

  if (clonedStyleValue?.previousSource?.value?.type === "layers") {
    return clonedStyleValue?.previousSource?.value;
  }

  if (clonedStyleValue?.cascaded?.value.type === "layers") {
    return clonedStyleValue?.cascaded?.value;
  }
  return { type: "layers" as const, value: [] };
};

export const getLayersStyleSource = (style: StyleInfo) => {
  return getStyleSource(...layeredBackgroundProps.map((prop) => style[prop]));
};

export const deleteLayers = (createBatchUpdate: CreateBatchUpdate) => {
  const batch = createBatchUpdate();
  for (const property of layeredBackgroundProps) {
    batch.deleteProperty(property);
  }
  batch.publish();
};

const isLayerStylesRecord = (value: {
  [property in LayeredBackgroundProperty]?: LayersValue;
}): value is Record<LayeredBackgroundProperty, LayersValue> => {
  for (const property of layeredBackgroundProps) {
    if (value[property] === undefined) {
      return false;
    }
  }
  return true;
};

const normalizeLayers = (
  style: StyleInfo,
  layerCount: number,
  batch: ReturnType<CreateBatchUpdate>
) => {
  const layerStyle: { [property in LayeredBackgroundProperty]?: LayersValue } =
    {};

  for (const property of layeredBackgroundProps) {
    const styleValue = style[property];

    // If a property is not defined, try copying it from the cascade, or set it as empty.
    const newPropertyStyle: LayersValue = getLayersValue(styleValue);

    const missingLayerCount = layerCount - newPropertyStyle.value.length;

    if (missingLayerCount < 0) {
      // This should never happen.
      throw new Error(
        `Layer count for property ${property} exceeds expected ${layerCount}`
      );
    }

    let isStyleChanged = styleValue?.local?.type !== "layers";

    if (newPropertyStyle.value.length !== layerCount) {
      // All background properties must have the same number of layers
      const requiredLayers = new Array(missingLayerCount).fill(
        structuredClone(layeredBackgroundPropsDefaults[property])
      );
      newPropertyStyle.value = newPropertyStyle.value.concat(requiredLayers);
      isStyleChanged = true;
    }

    layerStyle[property] = newPropertyStyle;
    if (isStyleChanged) {
      batch.setProperty(property)(newPropertyStyle);
    }
  }

  if (isLayerStylesRecord(layerStyle)) {
    return layerStyle;
  }

  throw new Error("Invalid layer styles");
};

export const setLayerProperty =
  (layerNum: number, style: StyleInfo, createBatchUpdate: CreateBatchUpdate) =>
  (propertyName: LayeredBackgroundProperty) =>
  (newValue: BackgroundStyleValue, options?: StyleUpdateOptions) => {
    const batch = createBatchUpdate();

    const layerCount = Math.max(getLayerCount(style), layerNum + 1);
    const layerStyles = normalizeLayers(style, layerCount, batch);

    if (newValue.type === "layers") {
      for (const property of layeredBackgroundProps) {
        const newPropertyStyle = layerStyles[property];

        const insertItems =
          property === propertyName
            ? newValue.value
            : Array.from(Array(newValue.value.length), (_, index) =>
                // Do not override existing values with defaults for layerNum layer
                index === 0
                  ? newPropertyStyle.value[layerNum] ??
                    layeredBackgroundPropsDefaults[property]
                  : layeredBackgroundPropsDefaults[property]
              );

        newPropertyStyle.value.splice(layerNum, 1, ...insertItems);

        batch.setProperty(property)(newPropertyStyle);
      }
    } else {
      layerStyles[propertyName].value[layerNum] = newValue;
      batch.setProperty(propertyName)(layerStyles[propertyName]);
    }

    batch.publish(options);
  };

export const addLayer = (
  style: StyleInfo,
  createBatchUpdate: CreateBatchUpdate
) => {
  const batch = createBatchUpdate();
  const layerCount = getLayerCount(style);

  const layerStyles = normalizeLayers(style, layerCount, batch);

  for (const property of layeredBackgroundProps) {
    const newPropertyStyle = layerStyles[property];

    const newValue = [...newPropertyStyle.value];

    newValue.splice(0, 0, layeredBackgroundPropsDefaults[property]);

    newPropertyStyle.value = newValue;

    batch.setProperty(property)(newPropertyStyle);
  }

  batch.publish();
};

export const deleteLayer =
  (layerNum: number, style: StyleInfo, createBatchUpdate: CreateBatchUpdate) =>
  () => {
    const layerCount = getLayerCount(style);

    const batch = createBatchUpdate();

    const layerStyles = normalizeLayers(style, layerCount, batch);

    for (const property of layeredBackgroundProps) {
      const newPropertyStyle = layerStyles[property];

      newPropertyStyle.value.splice(layerNum, 1);

      if (newPropertyStyle.value.length === 0) {
        batch.deleteProperty(property);
      } else {
        batch.setProperty(property)(newPropertyStyle);
      }
    }
    batch.publish();
  };

export const swapLayers = (
  newIndex: number,
  oldIndex: number,
  style: StyleInfo,
  createBatchUpdate: CreateBatchUpdate
) => {
  const batch = createBatchUpdate();
  const layerCount = Math.max(getLayerCount(style), newIndex + 1, oldIndex + 1);

  const layerStyles = normalizeLayers(style, layerCount, batch);

  for (const property of layeredBackgroundProps) {
    const newPropertyStyle = layerStyles[property];

    const newValue = [...newPropertyStyle.value];

    newValue.splice(oldIndex, 1);

    newValue.splice(newIndex, 0, newPropertyStyle.value[oldIndex]);

    newPropertyStyle.value = newValue;

    batch.setProperty(property)(newPropertyStyle);
  }

  batch.publish();
};
