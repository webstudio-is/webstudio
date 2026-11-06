import type { StyleValue } from "@webstudio-is/css-engine";

export const cannotRoundTripAsCssText = (
  value: StyleValue,
  allowAssets = false
): boolean => {
  if (value.hidden === true) {
    return true;
  }
  if (value.type === "image") {
    return !allowAssets && value.value.type === "asset";
  }
  if (value.type === "layers" || value.type === "tuple") {
    return value.value.some((part) =>
      cannotRoundTripAsCssText(part, allowAssets)
    );
  }
  if (value.type === "function") {
    return cannotRoundTripAsCssText(value.args, allowAssets);
  }
  if (value.type === "var") {
    return (
      value.fallback !== undefined &&
      cannotRoundTripAsCssText(value.fallback, allowAssets)
    );
  }
  if (value.type === "color") {
    return (
      typeof value.alpha !== "number" &&
      cannotRoundTripAsCssText(value.alpha, allowAssets)
    );
  }
  if (value.type === "shadow") {
    return [
      value.offsetX,
      value.offsetY,
      value.blur,
      value.spread,
      value.color,
    ].some(
      (part) =>
        part !== undefined && cannotRoundTripAsCssText(part, allowAssets)
    );
  }
  return false;
};
