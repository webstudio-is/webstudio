import type { LayersValue } from "@webstudio-is/css-data";
import type { StyleInfo, StyleValueInfo } from "../../shared/style-info";
import type {
  CreateBatchUpdate,
  StyleUpdateOptions,
} from "../../shared/use-style-data";

export const layeredBackgroundPropsDefaults = {
  backgroundAttachment: { type: "keyword", value: "scroll" },
  backgroundClip: { type: "keyword", value: "border-box" },
  backgroundBlendMode: { type: "keyword", value: "normal" },
  backgroundImage: { type: "keyword", value: "none" },
  backgroundOrigin: { type: "keyword", value: "padding-box" },
  backgroundPositionX: { type: "unit", value: 0, unit: "%" },
  backgroundPositionY: { type: "unit", value: 0, unit: "%" },
  backgroundRepeat: { type: "keyword", value: "repeat" },
  backgroundSize: { type: "keyword", value: "auto" },
} as const satisfies Record<string, BackgroundStyleValue>;

export type BackgroundStyleValue = LayersValue["value"][number];

export const layeredBackgroundProps = Object.keys(
  layeredBackgroundPropsDefaults
) as (keyof typeof layeredBackgroundPropsDefaults)[];

type LayeredBackgroundProps = (typeof layeredBackgroundProps)[number];

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

export const getLayerBackgroundProps = (layerNum: number, style: StyleInfo) => {
  const layerCount = getLayerCount(style);
  if (layerNum >= layerCount) {
    throw new Error(`${layerNum} is out of bounds`);
  }

  const result: Record<LayeredBackgroundProps, BackgroundStyleValue> = {
    ...layeredBackgroundPropsDefaults,
  };

  for (const property of layeredBackgroundProps) {
    const styleValue = style[property];

    const propertyStyle = styleValue?.value;

    if (propertyStyle?.type === "layers") {
      const styleValue = propertyStyle.value[layerNum];
      result[property] = styleValue;
    }
  }

  return result;
};

export const setLayerProperty =
  (layerNum: number, style: StyleInfo, createBatchUpdate: CreateBatchUpdate) =>
  (propertyName: LayeredBackgroundProps) =>
  (newValue: BackgroundStyleValue, options?: StyleUpdateOptions) => {
    const batch = createBatchUpdate();

    const layerCount = Math.max(getLayerCount(style), layerNum + 1);

    for (const property of layeredBackgroundProps) {
      let propertyChanged = false;

      const styleValue = style[property];

      const propertyStyle = styleValue?.local;

      // If property is not defined, try copy from cascade or set empty
      let newPropertyStyle: LayersValue;

      if (propertyStyle?.type === "layers") {
        newPropertyStyle = structuredClone(propertyStyle);
      } else if (styleValue?.cascaded?.value.type === "layers") {
        propertyChanged = true;
        newPropertyStyle = structuredClone(styleValue?.cascaded?.value);
      } else {
        propertyChanged = true;
        newPropertyStyle = { type: "layers", value: [] };
      }

      // All layers must have the same number of layers
      if (newPropertyStyle.value.length < layerCount) {
        propertyChanged = true;
        newPropertyStyle.value = newPropertyStyle.value.concat(
          new Array(layerCount - newPropertyStyle.value.length).fill(
            layeredBackgroundPropsDefaults[property]
          )
        );
      }

      if (newPropertyStyle.value.length > layerCount) {
        propertyChanged = true;
        newPropertyStyle.value = newPropertyStyle.value.slice(0, layerCount);
      }

      if (property === propertyName) {
        propertyChanged = true;
        newPropertyStyle.value[layerNum] = newValue;
      }

      if (propertyChanged) {
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
