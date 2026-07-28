import {
  getQueryFieldKey,
  queryCapabilities,
  type QueryCapabilities,
} from "@webstudio-is/query-builder";
import { z } from "zod";
import { assetResourceLimits } from "./asset-resource-limits";
import {
  assetObservedFieldType,
  assetQueryFieldPath,
  assetQueryOperators,
  assetQueryStandardFields,
  assetQueryStandardFieldTypes,
  assetResourceContentOptions,
  assetResourceOutputSelection,
  getAssetQueryOperatorsForFieldTypes,
  type AssetObservedFieldType,
  type AssetQueryOperator,
  type BuilderAssetFieldCatalog,
} from "@webstudio-is/content-engine";

const standardFieldLabels: Record<
  (typeof assetQueryStandardFields)[number],
  string
> = {
  id: "ID",
  name: "Name",
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

const operatorLabels: Record<AssetQueryOperator, string> = {
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

const getDefaultFilterValue = (operator: AssetQueryOperator) =>
  operator === "in"
    ? "[]"
    : operator === "exists" || operator === "isEmpty"
      ? "true"
      : '""';

const contentSchema = z.toJSONSchema(assetResourceContentOptions, {
  target: "draft-2020-12",
  io: "input",
});

const outputSchema = z.toJSONSchema(assetResourceOutputSelection, {
  target: "draft-2020-12",
  io: "input",
});

const maximumContentBytesField = {
  key: "maxBytes",
  label: "Maximum content bytes",
  type: "number" as const,
  min: 1,
  max: assetResourceLimits.hydratedFileBytes,
  optional: true,
};

export type AssetQueryCapabilities = QueryCapabilities<
  AssetObservedFieldType,
  AssetQueryOperator
>;

export const parseAssetQueryCapabilities = (
  value: unknown
): AssetQueryCapabilities => {
  const capabilities = queryCapabilities.parse(value);
  for (const field of capabilities.fields) {
    for (const type of field.types) {
      assetObservedFieldType.parse(type);
    }
  }
  for (const operator of capabilities.operators) {
    if (
      assetQueryOperators.includes(operator.value as AssetQueryOperator) ===
      false
    ) {
      throw new Error("Asset query capability operator is unsupported");
    }
    for (const type of operator.types) {
      assetObservedFieldType.parse(type);
    }
  }
  return capabilities as AssetQueryCapabilities;
};

export const addConfiguredAssetQueryFields = ({
  capabilities,
  configuredPaths,
}: {
  capabilities: AssetQueryCapabilities;
  configuredPaths: readonly string[][];
}): AssetQueryCapabilities => {
  const fields = new Map(
    capabilities.fields.map((field) => [getQueryFieldKey(field.path), field])
  );
  for (const path of configuredPaths) {
    const key = getQueryFieldKey(path);
    if (fields.has(key)) {
      continue;
    }
    fields.set(key, {
      path,
      label: path.join(" / "),
      // The observed catalog is advisory. Preserve configured schemaless
      // fields with every possible type until the field is observed again.
      types: [...assetObservedFieldType.options],
    });
  }
  return parseAssetQueryCapabilities({
    ...capabilities,
    fields: [...fields.values()],
  });
};

export const createAssetQueryCapabilities = ({
  catalog,
  configuredPaths = [],
}: {
  catalog?: BuilderAssetFieldCatalog;
  configuredPaths?: readonly string[][];
}): AssetQueryCapabilities => {
  const fields = new Map<string, AssetQueryCapabilities["fields"][number]>(
    assetQueryStandardFields.map((field) => [
      getQueryFieldKey([field]),
      {
        path: [field],
        label: standardFieldLabels[field],
        types: [...assetQueryStandardFieldTypes[field]],
      },
    ])
  );
  for (const field of Object.values(catalog?.fields ?? {})) {
    if (field.queryPath?.[0] !== "properties") {
      continue;
    }
    fields.set(getQueryFieldKey(field.queryPath), {
      path: field.queryPath,
      label: field.queryPath.join(" / "),
      types: field.types,
    });
  }
  const capabilities = addConfiguredAssetQueryFields({
    capabilities: {
      version: 1,
      fields: [...fields.values()],
      operators: assetQueryOperators.map((operator) => ({
        value: operator,
        label: operatorLabels[operator],
        types: assetObservedFieldType.options.filter((type) =>
          getAssetQueryOperatorsForFieldTypes([type]).includes(operator)
        ),
        input: {
          control: "expression" as const,
          defaultValue: getDefaultFilterValue(operator),
        },
      })),
      features: {
        combinators: ["all", "any"],
        sort: true,
        limit: true,
        offset: true,
      },
      limits: {
        conditions: assetResourceLimits.filterCount,
        depth: assetResourceLimits.filterDepth,
        sortFields: assetResourceLimits.sortCount,
      },
      defaults: {
        condition: {
          field: ["path"],
          operator: "startsWith",
        },
        sort: { field: ["name"], direction: "asc" },
        limit: String(assetResourceLimits.defaultResultCount),
        offset: "0",
      },
      source: {
        rootKey: "query",
        fieldPathSchema: z.toJSONSchema(assetQueryFieldPath, {
          target: "draft-2020-12",
          io: "input",
        }),
        parameters: [
          {
            key: "output",
            label: "Output fields",
            defaultValue: { mode: "all" },
            schema: outputSchema,
            control: {
              type: "variant",
              discriminator: "mode",
              options: [
                {
                  value: "all",
                  label: "All indexed fields",
                  defaultValue: { mode: "all" },
                  fields: [],
                },
                {
                  value: "base",
                  label: "File metadata only",
                  defaultValue: { mode: "base" },
                  fields: [],
                },
                {
                  value: "fields",
                  label: "Selected fields",
                  defaultValue: { mode: "fields", fields: [] },
                  fields: [
                    {
                      key: "fields",
                      label: "Fields",
                      type: "field-list",
                      max: assetResourceLimits.outputFieldCount,
                    },
                  ],
                },
              ],
            },
          },
          {
            key: "content",
            label: "File content",
            defaultValue: { mode: "none" },
            schema: contentSchema,
            control: {
              type: "variant",
              discriminator: "mode",
              options: [
                {
                  value: "none",
                  label: "Metadata only",
                  defaultValue: { mode: "none" },
                  fields: [],
                },
                {
                  value: "markdown-body",
                  label: "Markdown body",
                  defaultValue: {
                    mode: "markdown-body",
                    maxBytes: assetResourceLimits.hydratedFileBytes,
                  },
                  fields: [maximumContentBytesField],
                },
                {
                  value: "full",
                  label: "Full file",
                  defaultValue: {
                    mode: "full",
                    maxBytes: assetResourceLimits.hydratedFileBytes,
                  },
                  fields: [maximumContentBytesField],
                },
                {
                  value: "range",
                  label: "Byte range",
                  defaultValue: { mode: "range", offset: 0, length: 1024 },
                  fields: [
                    {
                      key: "offset",
                      label: "Content byte offset",
                      type: "number",
                      min: 0,
                    },
                    {
                      key: "length",
                      label: "Content byte length",
                      type: "number",
                      min: 1,
                      max: assetResourceLimits.hydratedRangeBytes,
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
      labels: {
        emptyAll: "All assets are included.",
        emptyAny: "No assets are included.",
      },
    },
    configuredPaths,
  });
  return capabilities;
};
