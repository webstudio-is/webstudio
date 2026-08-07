import { type QuerySourceDefinition } from "@webstudio-is/query-builder";
import { z } from "zod";
import { contentEngineLimits } from "./limits";
import {
  assetObservedFieldType,
  assetQueryFieldPath,
  assetQueryOperators,
  assetQueryStandardFields,
  assetQueryStandardFieldTypes,
  assetResourceContentOptions,
  assetResourceOutputSelection,
  defaultAssetResourceOutputSelection,
  getAssetQueryOperatorsForFieldTypes,
  type AssetObservedFieldType,
  type AssetQueryFilter,
  type AssetQueryResultMode,
} from "./schema";

export const assetQueryResultOptions = [
  { value: "many", label: "Many" },
  { value: "one", label: "Exactly one" },
  { value: "first", label: "First" },
  { value: "last", label: "Last" },
] as const satisfies readonly {
  value: AssetQueryResultMode;
  label: string;
}[];

const getDefaultFilterValue = (operator: AssetQueryFilter["operator"]) =>
  operator === "in"
    ? "[]"
    : operator === "exists" || operator === "isEmpty"
      ? "true"
      : '""';

const fieldLabels: Record<(typeof assetQueryStandardFields)[number], string> = {
  id: "id",
  url: "url",
  width: "width",
  height: "height",
  name: "name",
  description: "description",
  path: "path",
  key: "key",
  folderId: "folder id",
  extension: "extension",
  mimeType: "mime type",
  size: "size",
  createdAt: "created at",
  revision: "revision",
  excerpt: "excerpt",
};

const operatorLabels: Record<AssetQueryFilter["operator"], string> = {
  eq: "equals",
  ne: "does not equal",
  in: "is one of",
  contains: "contains",
  startsWith: "starts with",
  endsWith: "ends with",
  gt: "greater than",
  gte: "greater than or equal",
  lt: "less than",
  lte: "less than or equal",
  exists: "exists",
  isEmpty: "is empty",
};

/** Asset-specific source contract consumed by generic query codecs. */
export const assetQuerySourceDefinition = {
  fields: assetQueryStandardFields.map((field) => ({
    path: [field],
    label: fieldLabels[field],
    types: assetQueryStandardFieldTypes[field],
  })),
  operators: assetQueryOperators.map((operator) => ({
    value: operator,
    label: operatorLabels[operator],
    types: assetObservedFieldType.options.filter((type) =>
      getAssetQueryOperatorsForFieldTypes([type]).includes(operator)
    ),
    input: {
      control:
        operator === "exists" || operator === "isEmpty"
          ? ("none" as const)
          : ("expression" as const),
      defaultValue: getDefaultFilterValue(operator),
    },
  })),
  source: {
    fieldPathSchema: z.toJSONSchema(assetQueryFieldPath, {
      target: "draft-2020-12",
      io: "input",
    }),
    controls: [
      {
        type: "variant" as const,
        key: "output",
        label: "output",
        defaultValue: defaultAssetResourceOutputSelection,
        schema: z.toJSONSchema(assetResourceOutputSelection, {
          target: "draft-2020-12",
          io: "input",
        }),
      },
      {
        type: "variant" as const,
        key: "content",
        label: "content",
        defaultValue: { mode: "none" },
        schema: z.toJSONSchema(assetResourceContentOptions, {
          target: "draft-2020-12",
          io: "input",
        }),
      },
      {
        type: "select" as const,
        key: "result",
        label: "Result",
        sectionLabel: "Result",
        defaultValue: "many",
        options: assetQueryResultOptions,
      },
      {
        type: "filter" as const,
        key: "where",
        label: "filters",
        defaultValue: { all: [] },
        combinators: ["all", "any"] as const,
        limits: {
          conditions: contentEngineLimits.filterCount,
          depth: contentEngineLimits.filterDepth,
        },
        defaultCondition: {
          field: ["path"],
          operator: "startsWith" as const,
        },
      },
      {
        type: "sort" as const,
        key: "sort",
        label: "sort",
        defaultValue: [],
        defaultItem: { field: ["name"], direction: "asc" as const },
        directions: [
          { value: "asc", label: "Ascending" },
          { value: "desc", label: "Descending" },
        ],
        max: contentEngineLimits.sortCount,
      },
      {
        type: "expression" as const,
        key: "limit",
        label: "limit",
        defaultValue: String(contentEngineLimits.defaultResultCount),
        input: "number" as const,
        min: 0,
        max: contentEngineLimits.resultCount,
        integer: true,
      },
      {
        type: "expression" as const,
        key: "offset",
        label: "offset",
        defaultValue: "0",
        input: "number" as const,
        min: 0,
        max: contentEngineLimits.candidateDocuments,
        integer: true,
      },
    ],
  },
} satisfies QuerySourceDefinition<
  AssetObservedFieldType,
  AssetQueryFilter["operator"]
>;
