import type { StyleValue } from "@webstudio-is/react-sdk";
import { DEFAULT_FONT_FALLBACK, SYSTEM_FONTS } from "@webstudio-is/fonts";

type ToCssOptions = {
  withFallback: boolean;
};

const defaultOptions = {
  withFallback: true,
};

export const toValue = (
  value?: StyleValue,
  options: ToCssOptions = defaultOptions
): string => {
  if (value === undefined) return "";
  if (value.type === "unit") {
    return value.value + (value.unit === "number" ? "" : value.unit);
  }
  if (value.type === "fontFamily") {
    if (options.withFallback === false) {
      return value.value[0];
    }
    const family = value.value[0];
    const fallbacks = SYSTEM_FONTS.get(family);
    if (Array.isArray(fallbacks)) {
      return [...value.value, ...fallbacks].join(", ");
    }
    return [...value.value, DEFAULT_FONT_FALLBACK].join(", ");
  }
  if (value.type === "var") {
    const fallbacks = [];
    for (const fallback of value.fallbacks) {
      fallbacks.push(toValue(fallback, options));
    }
    const fallbacksString =
      fallbacks.length > 0 ? `, ${fallbacks.join(", ")}` : "";
    return `var(--${value.value}${fallbacksString})`;
  }
  return value.value;
};
