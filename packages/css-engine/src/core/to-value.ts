import type { StyleValue } from "@webstudio-is/css-data";
import { DEFAULT_FONT_FALLBACK, SYSTEM_FONTS } from "@webstudio-is/fonts";

type ToCssOptions = {
  withFallback: boolean;
};

const defaultOptions = {
  withFallback: true,
};

// exhaustive check, should never happen in runtime as ts would give error
const assertUnreachable = (_arg: never, errorMessage: string) => {
  throw new Error(errorMessage);
};

export const toValue = (
  value?: StyleValue,
  options: ToCssOptions = defaultOptions,
  isEditMode?: boolean
): string => {
  if (value === undefined) {
    return "";
  }
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
    // We use var() in edit mode only
    const isEditMode = true;
    const fallbacks = [];
    for (const fallback of value.fallbacks) {
      fallbacks.push(toValue(fallback, options, isEditMode));
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
    if (isEditMode && value.hidden) {
      // We assume that property is background-image and use this to hide background layers
      // In the future we might want to have a more generic way to hide values
      // i.e. have knowledge about property-name, as none is property specific
      return "none";
    }

    // @todo image-set
    return `url(${value.value.value.path}) /* id=${value.value.value.id} */`;
  }

  if (value.type === "unparsed") {
    if (isEditMode && value.hidden) {
      // We assume that property is background-image and use this to hide background layers
      // In the future we might want to have a more generic way to hide values
      // i.e. have knowledge about property-name, as none is property specific
      return "none";
    }

    return value.value;
  }

  if (value.type === "layers") {
    return value.value
      .map((value) => toValue(value, options, isEditMode))
      .join(",");
  }

  if (value.type === "tuple") {
    return value.value
      .map((value) => toValue(value, options, isEditMode))
      .join(" ");
  }

  // Will give ts error in case of missing type
  assertUnreachable(value, `Unknown value type`);

  // Will never happen
  throw new Error("Unknown value type");
};
