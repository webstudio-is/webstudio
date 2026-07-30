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
} from "./schema";

const getDefaultFilterValue = (operator: AssetQueryFilter["operator"]) =>
  operator === "in"
    ? "[]"
    : operator === "exists" || operator === "isEmpty"
      ? "true"
      : '""';

const fieldLabels: Record<(typeof assetQueryStandardFields)[number], string> = {
  id: "ID",
  url: "URL",
  width: "Width",
  height: "Height",
  name: "Name",
  description: "Description",
  path: "Path",
  key: "Key",
  folderId: "Folder ID",
  extension: "Extension",
  mimeType: "MIME type",
  size: "Size",
  createdAt: "Created at",
  revision: "Revision",
  excerpt: "Excerpt",
};

const operatorLabels: Record<AssetQueryFilter["operator"], string> = {
  eq: "Equals",
  ne: "Does not equal",
  in: "Is one of",
  contains: "Contains",
  startsWith: "Starts with",
  endsWith: "Ends with",
  gt: "Greater than",
  gte: "Greater than or equal",
  lt: "Less than",
  lte: "Less than or equal",
  exists: "Exists",
  isEmpty: "Is empty",
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
