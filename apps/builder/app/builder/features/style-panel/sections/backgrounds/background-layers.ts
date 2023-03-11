import type { LayersValue, StyleValue } from "@webstudio-is/css-data";
import type { StyleInfo, StyleValueInfo } from "../../shared/style-info";
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

export type BackgroundStyleValue = LayersValue["value"][number];

export const isBackgroundStyleValue = (
  style: StyleValue
): style is BackgroundStyleValue => {
  if (
    style.type === "unit" ||
    style.type === "keyword" ||
    style.type === "unparsed" ||
    style.type === "image" ||
    style.type === "tuple" ||
    style.type === "invalid"
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

    if (valueStyle?.type === "layers") {
      const styleValue = valueStyle.value[layerNum];
      resultProperty["value"] = styleValue;
    }
    if (localStyle?.type === "layers") {
      const styleValue = localStyle.value[layerNum];
      resultProperty["local"] = styleValue;
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

export const setLayerProperty =
  (layerNum: number, style: StyleInfo, createBatchUpdate: CreateBatchUpdate) =>
  (propertyName: LayeredBackgroundProperty) =>
  (newValue: BackgroundStyleValue, options?: StyleUpdateOptions) => {
    const batch = createBatchUpdate();
    const layerCount = Math.max(getLayerCount(style), layerNum + 1);

    const getLayersValue = (styleValue?: StyleValueInfo) => {
      const clonedStyleValue: StyleValueInfo | undefined =
        structuredClone(styleValue);
      if (clonedStyleValue?.local?.type === "layers") {
        return clonedStyleValue.local;
      }
      if (clonedStyleValue?.cascaded?.value.type === "layers") {
        return clonedStyleValue?.cascaded?.value;
      }
      return { type: "layers" as const, value: [] };
    };

    for (const property of layeredBackgroundProps) {
      const styleValue = style[property];

      // If property is not defined, try copy from cascade or set empty
      const newPropertyStyle: LayersValue = getLayersValue(styleValue);

      const missingLayerCount = layerCount - newPropertyStyle.value.length;

      if (missingLayerCount < 0) {
        // In theory this should never happen.
        throw new Error(
          `Layer count for property ${property} exceeds expected ${layerCount}`
        );
      }

      let isPropertyChanged = styleValue?.local?.type !== "layers";

      if (newPropertyStyle.value.length !== layerCount) {
        // All background properties must have the same number of layers
        const requiredLayers = new Array(missingLayerCount).fill(
          structuredClone(layeredBackgroundPropsDefaults[property])
        );
        newPropertyStyle.value = newPropertyStyle.value.concat(requiredLayers);
        isPropertyChanged = true;
      }

      if (property === propertyName) {
        newPropertyStyle.value[layerNum] = newValue;
        isPropertyChanged = true;
      }

      if (isPropertyChanged) {
        batch.setProperty(property)(newPropertyStyle);
      }
    }

    batch.publish(options);
  };

export const addLayer = (
  style: StyleInfo,
  createBatchUpdate: CreateBatchUpdate
) => {
  const layerCount = getLayerCount(style);
  setLayerProperty(layerCount, style, createBatchUpdate)("backgroundImage")({
    type: "keyword",
    value: "none",
  });
};

export const deleteLayer =
  (layerNum: number, style: StyleInfo, createBatchUpdate: CreateBatchUpdate) =>
  () => {
    const layerCount = getLayerCount(style);

    const batch = createBatchUpdate();

    for (const property of layeredBackgroundProps) {
      const styleValue = style[property];

      const propertyStyle = styleValue?.local;

      // If property is not defined, try copy from cascade or set empty
      let newPropertyStyle: LayersValue;

      if (propertyStyle?.type === "layers") {
        newPropertyStyle = structuredClone(propertyStyle);
      } else if (styleValue?.cascaded?.value.type === "layers") {
        newPropertyStyle = structuredClone(styleValue?.cascaded?.value);
      } else {
        newPropertyStyle = { type: "layers", value: [] };
      }

      // All layers must have the same number of layers
      if (newPropertyStyle.value.length < layerCount) {
        newPropertyStyle.value = newPropertyStyle.value.concat(
          new Array(layerCount - newPropertyStyle.value.length).fill(
            layeredBackgroundPropsDefaults[property]
          )
        );
      }

      if (newPropertyStyle.value.length > layerCount) {
        newPropertyStyle.value = newPropertyStyle.value.slice(0, layerCount);
      }

      newPropertyStyle.value.splice(layerNum, 1);

      if (newPropertyStyle.value.length === 0) {
        batch.deleteProperty(property);
      } else {
        batch.setProperty(property)(newPropertyStyle);
      }
    }
    batch.publish();
  };
