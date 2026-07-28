import { z } from "zod";
import {
  createQueryWhereSchema,
  getQueryWhereMetrics,
  type QueryWhereTree,
} from "@webstudio-is/query-builder";
import {
  assetQueryFieldPath,
  assetQueryOperators,
  assetQuerySort,
  assetResourceContentOptions,
  assetResourceOutputSelection,
  type AssetQueryFieldPath,
  type AssetQueryFilter,
} from "@webstudio-is/content-engine";
import { assetResourceLimits } from "../asset-resource-limits";

const assetQueryLiteral = <Schema extends z.ZodType>(value: Schema) =>
  z.strictObject({ type: z.literal("literal"), value });

export const assetQueryFilterValueExpression = z.union([
  z.string(),
  assetQueryLiteral(z.json()),
]);

export type AssetQueryFilterValueExpression = z.infer<
  typeof assetQueryFilterValueExpression
>;

export type AssetQueryWhereExpression = QueryWhereTree<{
  field: AssetQueryFieldPath;
  operator: AssetQueryFilter["operator"];
  value: AssetQueryFilterValueExpression;
}>;

const assetQueryWhereExpressionNode: z.ZodType<
  AssetQueryWhereExpression,
  AssetQueryWhereExpression
> = createQueryWhereSchema(
  z.strictObject({
    field: assetQueryFieldPath.describe(
      'Indexed file field path, for example ["extension"] or ["properties", "slug"].'
    ),
    operator: z.enum(assetQueryOperators),
    value: assetQueryFilterValueExpression.describe(
      'A Webstudio expression, or { type: "literal", value: <JSON value> } for fixed data.'
    ),
  })
);

export const assetQueryWhereExpression =
  assetQueryWhereExpressionNode.superRefine((where, context) => {
    const { conditions: filters, depth } = getQueryWhereMetrics(where);
    if (filters > assetResourceLimits.filterCount) {
      context.addIssue({
        code: "custom",
        message: "Asset query exceeds the filter limit",
      });
    }
    if (depth > assetResourceLimits.filterDepth) {
      context.addIssue({
        code: "custom",
        message: "Asset query exceeds the filter nesting limit",
      });
    }
  });

export const assetQueryLimitExpression = z.union([
  z.string(),
  assetQueryLiteral(
    z.number().int().nonnegative().max(assetResourceLimits.resultCount)
  ),
]);

export const assetQueryOffsetExpression = z.union([
  z.string(),
  assetQueryLiteral(
    z.number().int().nonnegative().max(assetResourceLimits.candidateDocuments)
  ),
]);

export const assetQueryResourceConfigurationInput = z.strictObject({
  where: assetQueryWhereExpression
    .describe(
      "A boolean filter tree. Use { all: [...] } for AND and { any: [...] } for OR; leaves contain field, operator, and value."
    )
    .default({ all: [] }),
  sort: z.array(assetQuerySort).max(assetResourceLimits.sortCount).default([]),
  limit: assetQueryLimitExpression
    .describe(
      'A Webstudio expression, or { type: "literal", value: number } for a fixed result limit.'
    )
    .default(String(assetResourceLimits.defaultResultCount)),
  offset: assetQueryOffsetExpression
    .describe(
      'A Webstudio expression, or { type: "literal", value: number } for a fixed result offset.'
    )
    .default("0"),
  output: assetResourceOutputSelection.default({ mode: "all" }),
  content: assetResourceContentOptions.default({ mode: "none" }),
});

export const assetQueryResourceConfigurationPatchInput = z.strictObject({
  where: assetQueryResourceConfigurationInput.shape.where
    .removeDefault()
    .optional(),
  sort: assetQueryResourceConfigurationInput.shape.sort
    .removeDefault()
    .optional(),
  limit: assetQueryResourceConfigurationInput.shape.limit
    .removeDefault()
    .optional(),
  offset: assetQueryResourceConfigurationInput.shape.offset
    .removeDefault()
    .optional(),
  output: assetQueryResourceConfigurationInput.shape.output
    .removeDefault()
    .optional(),
  content: assetQueryResourceConfigurationInput.shape.content
    .removeDefault()
    .optional(),
});

export type AssetQueryResourceConfigurationInput = z.input<
  typeof assetQueryResourceConfigurationInput
>;

export type AssetQueryResourceConfiguration = z.output<
  typeof assetQueryResourceConfigurationInput
>;
