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
  options: ToCssOptions = defaultOptions
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
    const fallbacks = [];
    for (const fallback of value.fallbacks) {
      fallbacks.push(toValue(fallback, options));
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
    // @todo image-set
    return value.value
      .map(
        (imageAsset) =>
          `url(${imageAsset.value.path}) /* id=${imageAsset.value.id} */`
      )
      .join(", ");
  }

  if (value.type === "unparsed") {
    return value.value;
  }

  // Will give ts error in case of missing type
  assertUnreachable(value, `Unknown value type`);

  // Will never happen
  throw new Error("Unknown value type");
};
