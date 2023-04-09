import type { StyleValue } from "@webstudio-is/css-data";
import { DEFAULT_FONT_FALLBACK, SYSTEM_FONTS } from "@webstudio-is/fonts";

export type TransformValue = (styleValue: StyleValue) => undefined | StyleValue;

// exhaustive check, should never happen in runtime as ts would give error
const assertUnreachable = (_arg: never, errorMessage: string) => {
  throw new Error(errorMessage);
};

const fallbackTransform: TransformValue = (styleValue) => {
  if (styleValue.type === "fontFamily") {
    const firstFontFamily = styleValue.value[0];
    const fallbacks = SYSTEM_FONTS.get(firstFontFamily);
    const fontFamily: string[] = [...styleValue.value];
    if (Array.isArray(fallbacks)) {
      fontFamily.push(...fallbacks);
    } else {
      fontFamily.push(DEFAULT_FONT_FALLBACK);
    }
    return {
      type: "fontFamily",
      value: fontFamily,
    };
  }
};

export const toValue = (
  styleValue: undefined | StyleValue,
  transformValue?: TransformValue
): string => {
  if (styleValue === undefined) {
    return "";
  }
  const transformedValue =
    transformValue?.(styleValue) ?? fallbackTransform(styleValue);
  const value = transformedValue ?? styleValue;
  if (value.type === "unit") {
    return value.value + (value.unit === "number" ? "" : value.unit);
  }
  if (value.type === "fontFamily") {
    return value.value.join(", ");
  }
  if (value.type === "var") {
    const fallbacks = [];
    for (const fallback of value.fallbacks) {
      fallbacks.push(toValue(fallback, transformValue));
    }
    const fallbacksString =
      fallbacks.length > 0 ? `, ${fallbacks.join(", ")}` : "";
    return `var(--${value.value}${fallbacksString})`;
  }

  if (value.type === "keyword") {
    return value.value;
  }

  if (value.type === "invalid") {
    return value.value;
  }

  if (value.type === "unset") {
    return value.value;
  }

  if (value.type === "rgb") {
    return `rgba(${value.r}, ${value.g}, ${value.b}, ${value.alpha})`;
  }

  if (value.type === "image") {
    if (value.hidden || value.value.type !== "url") {
      // We assume that property is background-image and use this to hide background layers
      // In the future we might want to have a more generic way to hide values
      // i.e. have knowledge about property-name, as none is property specific
      return "none";
    }

    // @todo image-set
    return `url(${value.value.url})`;
  }

  if (value.type === "unparsed") {
    if (value.hidden) {
      // We assume that property is background-image and use this to hide background layers
      // In the future we might want to have a more generic way to hide values
      // i.e. have knowledge about property-name, as none is property specific
      return "none";
    }

    return value.value;
  }

  if (value.type === "layers") {
    return value.value.map((value) => toValue(value, transformValue)).join(",");
  }

  if (value.type === "tuple") {
    return value.value.map((value) => toValue(value, transformValue)).join(" ");
  }

  // Will give ts error in case of missing type
  assertUnreachable(value, `Unknown value type`);

  // Will never happen
  throw new Error("Unknown value type");
};
