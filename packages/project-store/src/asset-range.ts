import type { ProjectAssetReadRange } from "./types";

export const validateProjectAssetReadRange = (
  range: ProjectAssetReadRange,
  maximumSize?: number
) => {
  const end = range.offset + range.length;
  if (
    Number.isSafeInteger(range.offset) === false ||
    range.offset < 0 ||
    Number.isSafeInteger(range.length) === false ||
    range.length <= 0 ||
    Number.isSafeInteger(end) === false ||
    (maximumSize !== undefined && end > maximumSize)
  ) {
    throw new Error("Project asset read range is invalid");
  }
};
