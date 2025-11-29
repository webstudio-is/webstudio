import { DEFAULT_FONT_FALLBACK, SYSTEM_FONTS } from "@webstudio-is/fonts";
import type { StyleValue } from "../schema";

export type TransformValue = (styleValue: StyleValue) => undefined | StyleValue;

const fallbackTransform: TransformValue = (styleValue) => {
  if (styleValue.type !== "fontFamily") {
    return;
  }

  // By default we assume its a custom font stack.
  let { value } = styleValue;

  // Shouldn't be possible, but just in case.
  if (value.length === 0) {
    value = [DEFAULT_FONT_FALLBACK];
  }

  // User provided a single name. It could be a specific font name or a stack name.
  if (value.length === 1) {
    const stack = SYSTEM_FONTS.get(value[0])?.stack;
    value = stack ?? [value[0], DEFAULT_FONT_FALLBACK];
  }

  return {
    type: "fontFamily",
    value: Array.from(new Set(value)),
  };
};

// Use JSON.stringify to escape double quotes and backslashes in strings as it automatically replaces " with \" and \ with \\.
const sanitizeCssUrl = (str: string) => JSON.stringify(str);

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
    const families = [];
    for (const family of value.value) {
      families.push(family.includes(" ") ? `"${family}"` : family);
    }
    return families.join(", ");
  }
  if (value.type === "var") {
    if (value.hidden) {
      return "";
    }
    let fallbacksString = "";
    if (value.fallback) {
      fallbacksString = `, ${toValue(value.fallback, transformValue)}`;
    }
    return `var(--${value.value}${fallbacksString})`;
  }

  if (value.type === "keyword") {
    // The hidden property is used to hide values in the builder
    // But we can't use none here like its done for image.
    // As none is not valid in all cases.
    // Eg: backface-visibility
    // https://developer.mozilla.org/en-US/docs/Web/CSS/backface-visibility#syntax
    if (value.hidden === true) {
      return "";
    }

    return value.value;
  }

  if (value.type === "invalid") {
    return value.value;
  }

  if (value.type === "unset") {
    return value.value;
  }

  if (value.type === "rgb") {
    return `rgb(${value.r} ${value.g} ${value.b} / ${value.alpha})`;
  }

  if (value.type === "color") {
    let [c1, c2, c3] = value.components;
    const alpha = value.alpha;

    // Use specific CSS functions when available
    switch (value.colorSpace) {
      case "srgb": {
        c1 = Math.round(c1 * 255);
        c2 = Math.round(c2 * 255);
        c3 = Math.round(c3 * 255);
        return `rgb(${c1} ${c2} ${c3} / ${alpha})`;
      }
      case "hsl":
        return `hsl(${c1} ${c2}% ${c3}% / ${alpha})`;
      case "hwb":
        return `hwb(${c1} ${c2}% ${c3}% / ${alpha})`;
      case "lab":
        return `lab(${c1}% ${c2} ${c3} / ${alpha})`;
      case "lch":
        return `lch(${c1}% ${c2} ${c3} / ${alpha})`;
      case "oklab":
        return `oklab(${c1} ${c2} ${c3} / ${alpha})`;
      case "oklch":
        return `oklch(${c1} ${c2} ${c3} / ${alpha})`;
      // Fall back to color() function for less common color spaces
      case "p3":
      case "srgb-linear":
      case "a98rgb":
      case "prophoto":
      case "rec2020":
      case "xyz-d65":
      case "xyz-d50":
      default:
        return `color(${value.colorSpace} ${c1} ${c2} ${c3} / ${alpha})`;
    }
  }

  if (value.type === "image") {
    if (value.hidden || value.value.type !== "url") {
      // We assume that property is background-image and use this to hide background layers
      // In the future we might want to have a more generic way to hide values
      // i.e. have knowledge about property-name, as none is property specific
      return "none";
    }

    // @todo image-set
    return `url(${sanitizeCssUrl(value.value.url)})`;
  }

  if (value.type === "unparsed") {
    if (value.hidden === true) {
      // We assume that property is background-image and use this to hide background layers
      // In the future we might want to have a more generic way to hide values
      // i.e. have knowledge about property-name, as none is property specific
      return "none";
    }

    return value.value;
  }

  if (value.type === "layers") {
    const valueString = value.value
      .filter((layer) => layer.hidden !== true)
      .map((layer) => toValue(layer, transformValue))
      .join(", ");
    return valueString === "" ? "none" : valueString;
  }

  if (value.type === "tuple") {
    // Properties ike translate and scale are handled as tuples directly.
    // When the layer is hidden, the value goes as none.
    if (value.hidden === true) {
      return "none";
    }

    return value.value
      .filter((value) => value.hidden !== true)
      .map((value) => toValue(value, transformValue))
      .join(" ");
  }

  if (value.type === "shadow") {
    let shadow = `${toValue(value.offsetX)} ${toValue(value.offsetY)}`;
    if (value.blur) {
      shadow += ` ${toValue(value.blur)}`;
    }
    if (value.spread) {
      shadow += ` ${toValue(value.spread)}`;
    }
    if (value.color) {
      shadow += ` ${toValue(value.color)}`;
    }
    if (value.position === "inset") {
      shadow += ` inset`;
    }
    return shadow;
  }

  if (value.type === "function") {
    // Right now, we are using function-value only for filter and backdrop-filter functions
    if (value.hidden === true) {
      return "";
    }

    return `${value.name}(${toValue(value.args, transformValue)})`;
  }

  // https://www.w3.org/TR/css-variables-1/#guaranteed-invalid
  if (value.type === "guaranteedInvalid") {
    return "";
  }

  value satisfies never;
  return "";
};
