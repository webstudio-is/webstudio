import type { AssetResourceContentOptions } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";

const isIntegerInRange = (
  value: unknown,
  minimum: number,
  maximum: number
): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= minimum &&
  value <= maximum;

/** Lightweight counterpart of the request schema for published runtimes. */
export const parseAssetResourceContentOptions = (
  value: Readonly<Record<string, unknown>>
): AssetResourceContentOptions | undefined => {
  if (value.mode === "none") {
    return { mode: "none" };
  }
  if (value.mode === "range") {
    if (
      isIntegerInRange(value.offset, 0, Number.MAX_SAFE_INTEGER) === false ||
      isIntegerInRange(
        value.length,
        1,
        assetResourceLimits.hydratedRangeBytes
      ) === false
    ) {
      return;
    }
    return { mode: "range", offset: value.offset, length: value.length };
  }
  if (value.mode !== "full" && value.mode !== "markdown-body") {
    return;
  }
  if (
    value.maxBytes !== undefined &&
    isIntegerInRange(
      value.maxBytes,
      1,
      assetResourceLimits.hydratedFileBytes
    ) === false
  ) {
    return;
  }
  return { mode: value.mode, maxBytes: value.maxBytes as number | undefined };
};
