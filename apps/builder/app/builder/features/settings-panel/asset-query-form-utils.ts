import {
  createStructuredAssetQueryResourceBody,
  type StructuredAssetQueryResourceConfiguration,
  type StructuredAssetQueryFilterBinding,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  getQueryConditions,
  getQueryWhereMetrics,
} from "@webstudio-is/query-builder";
import { getExpressionErrorMessages } from "@webstudio-is/project-build/runtime";

export const getAssetQueryConfigurationError = (
  configuration: StructuredAssetQueryResourceConfiguration
) => {
  const filters = getQueryConditions<StructuredAssetQueryFilterBinding>(
    configuration.where
  );
  const metrics = getQueryWhereMetrics(configuration.where);
  if (filters.length > assetResourceLimits.filterCount) {
    return `Use at most ${assetResourceLimits.filterCount} filters.`;
  }
  if (metrics.depth > assetResourceLimits.filterDepth) {
    return `Nest filters at most ${assetResourceLimits.filterDepth} levels.`;
  }
  if (configuration.sort.length > assetResourceLimits.sortCount) {
    return `Use at most ${assetResourceLimits.sortCount} sort fields.`;
  }
  const expressions = [
    ...filters.map(({ value }) => value),
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
