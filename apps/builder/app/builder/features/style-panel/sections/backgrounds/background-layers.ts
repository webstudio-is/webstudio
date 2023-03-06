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
  backgroundPositionX: { type: "unit", value: 0, unit: "%" },
  backgroundPositionY: { type: "unit", value: 0, unit: "%" },
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
    const styleValue = style[property];

    const valueStyle = styleValue?.value;
    const localStyle = styleValue?.local;
    const cascadedStyle = styleValue?.cascaded;

    if (valueStyle?.type === "layers") {
      const styleValue = valueStyle.value[layerNum];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result[property]!["value"] = styleValue;
    }
    if (localStyle?.type === "layers") {
      const styleValue = localStyle.value[layerNum];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result[property]!["local"] = styleValue;
    }
    if (cascadedStyle?.value.type === "layers") {
      const styleValue = cascadedStyle.value.value[layerNum];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result[property]!["cascaded"] = {
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
