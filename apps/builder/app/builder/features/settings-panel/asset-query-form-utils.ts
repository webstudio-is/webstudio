import {
  assetResourceLimits,
  createStructuredAssetQueryResourceBody,
  parseStructuredAssetQueryResourceBody,
  type StructuredAssetQueryResourceConfiguration,
} from "@webstudio-is/sdk";
import { getExpressionErrorMessages } from "@webstudio-is/project-build/runtime";

export {
  createStructuredAssetQueryResourceBody,
  parseStructuredAssetQueryResourceBody,
};
export type { StructuredAssetQueryResourceConfiguration };

export const isEmptyAssetQueryResult = (result: unknown) =>
  typeof result === "object" &&
  result !== null &&
  "items" in result &&
  Array.isArray(result.items) &&
  result.items.length === 0;

export const getAssetQueryConfigurationError = (
  configuration: StructuredAssetQueryResourceConfiguration
) => {
  if (configuration.filters.length > assetResourceLimits.filterCount) {
    return `Use at most ${assetResourceLimits.filterCount} filters.`;
  }
  if (configuration.sort.length > assetResourceLimits.sortCount) {
    return `Use at most ${assetResourceLimits.sortCount} sort fields.`;
  }
  const expressions = [
    ...configuration.filters.map(({ value }) => value),
    configuration.limit,
    configuration.offset,
  ];
  if (
    expressions.some(
      (expression) => getExpressionErrorMessages({ expression }).length > 0
    )
  ) {
    return "Enter a valid Webstudio expression for every query value.";
  }
  try {
    createStructuredAssetQueryResourceBody(configuration);
  } catch {
    return "Complete every Assets query field.";
  }
};
