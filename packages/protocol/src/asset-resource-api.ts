import { z } from "zod";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  asset,
  assetType,
  assetFolder,
  assetFolderId,
  assetFolderName,
} from "@webstudio-is/sdk/schema";
import {
  assetQueryRequest,
  assetQueryPreviewResult,
  assetQueryResultOptions,
  assetQuerySourceDefinition,
  assetQueryResult,
  assetResourceQueryFailure,
  builderAssetFieldCatalog,
  getAssetQueryOperatorsForFieldTypes,
  type AssetObservedFieldType,
  type AssetQueryOperator,
} from "@webstudio-is/content-engine";
import {
  assetsFieldCatalogApiUrl,
  assetsOpenApiUrl,
  assetsApiUrl,
  assetsFoldersApiUrl,
  assetsIndexRefreshApiUrl,
  assetsUploadsApiUrl,
  assetsQueryApiUrl,
  assetsQuerySchemaApiUrl,
} from "@webstudio-is/sdk/runtime";
import type { BuilderAssetFieldCatalog } from "@webstudio-is/content-engine";

const assetItemApiPath = `${assetsApiUrl}/{assetId}`;
const assetContentApiPath = `${assetItemApiPath}/content`;
const assetFolderItemApiPath = `${assetsFoldersApiUrl}/{folderId}`;

export const assetContentDescriptorHeader =
  "x-webstudio-asset-content-descriptor";

export const assetContentDescriptor = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  type: assetType,
  format: z.string(),
  size: z.number().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type AssetContentDescriptor = z.infer<typeof assetContentDescriptor>;

export const serializeAssetContentDescriptor = (
  value: AssetContentDescriptor
) => encodeURIComponent(JSON.stringify(assetContentDescriptor.parse(value)));

export const parseAssetContentDescriptor = (value: string | null) => {
  if (value === null) {
    throw new Error("Asset content response is missing its revision identity");
  }
  try {
    return assetContentDescriptor.parse(JSON.parse(decodeURIComponent(value)));
  } catch (cause) {
    throw new Error("Asset content response has an invalid revision identity", {
      cause,
    });
  }
};

const operation = <
  OperationId extends string,
  Method extends string,
  Path extends string,
>(
  operationId: OperationId,
  method: Method,
  path: Path
) => ({
  operationId,
  method,
  path,
});

export const assetResourceApiOperations = {
  listAssets: operation("listAssets", "get", assetsApiUrl),
  reserveAssetUpload: operation(
    "reserveAssetUpload",
    "post",
    assetsUploadsApiUrl
  ),
  uploadAssetContent: operation(
    "uploadAssetContent",
    "post",
    `${assetsUploadsApiUrl}/{name}`
  ),
  updateAsset: operation("updateAsset", "patch", assetItemApiPath),
  getAsset: operation("getAsset", "get", assetItemApiPath),
  deleteAsset: operation("deleteAsset", "delete", assetItemApiPath),
  replaceAssetContent: operation(
    "replaceAssetContent",
    "put",
    assetContentApiPath
  ),
  downloadAssetContent: operation(
    "downloadAssetContent",
    "get",
    assetContentApiPath
  ),
  listAssetFolders: operation("listAssetFolders", "get", assetsFoldersApiUrl),
  createAssetFolder: operation(
    "createAssetFolder",
    "post",
    assetsFoldersApiUrl
  ),
  updateAssetFolder: operation(
    "updateAssetFolder",
    "patch",
    assetFolderItemApiPath
  ),
  getAssetFolder: operation("getAssetFolder", "get", assetFolderItemApiPath),
  deleteAssetFolder: operation(
    "deleteAssetFolder",
    "delete",
    assetFolderItemApiPath
  ),
  queryAssets: operation("queryAssets", "post", assetsQueryApiUrl),
  getAssetFieldCatalog: operation(
    "getAssetFieldCatalog",
    "get",
    assetsFieldCatalogApiUrl
  ),
  getAssetResourceOpenApi: operation(
    "getAssetResourceOpenApi",
    "get",
    assetsOpenApiUrl
  ),
  getAssetQuerySchema: operation(
    "getAssetQuerySchema",
    "get",
    assetsQuerySchemaApiUrl
  ),
  refreshAssetIndex: operation(
    "refreshAssetIndex",
    "post",
    assetsIndexRefreshApiUrl
  ),
} as const;

export const assetUploadReservationRequest = z.strictObject({
  projectId: z
    .string()
    .min(1)
    .max(assetResourceLimits.assetIdentifierCharacters),
  type: assetType,
  filename: z.string().min(1).max(assetResourceLimits.assetFilenameCharacters),
  displayFilename: z
    .string()
    .min(1)
    .max(assetResourceLimits.assetFilenameCharacters)
    .optional(),
  description: z
    .string()
    .max(assetResourceLimits.assetDescriptionCharacters)
    .optional(),
  folderId: z
    .string()
    .min(1)
    .max(assetResourceLimits.assetIdentifierCharacters)
    .optional(),
  contentHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});

/** Concrete query payload accepted by the Assets REST API. */
export type AssetQueryRequestInput = z.input<typeof assetQueryRequest>;

const assetUploadTicket = z.discriminatedUnion("deduplicated", [
  z.strictObject({
    assetId: z.string().min(1),
    name: z.string().min(1),
    deduplicated: z.literal(false),
  }),
  z.strictObject({
    assetId: z.string().min(1),
    name: z.string().min(1),
    deduplicated: z.literal(true),
    asset,
  }),
]);

const assetUploadResult = z.strictObject({
  uploadedAssets: z.array(asset),
  deduplicated: z.boolean(),
});
export type AssetUploadResult = z.infer<typeof assetUploadResult>;

const assetListResult = z.strictObject({ assets: z.array(asset) });

const assetItemResult = z.strictObject({ asset });

export const assetMetadataUpdate = z
  .strictObject({
    filename: z
      .string()
      .min(1)
      .max(assetResourceLimits.assetFilenameCharacters)
      .nullable()
      .optional(),
    description: z
      .string()
      .max(assetResourceLimits.assetDescriptionCharacters)
      .nullable()
      .optional(),
    folderId: z
      .string()
      .min(1)
      .max(assetResourceLimits.assetIdentifierCharacters)
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one asset metadata field is required",
  });
export type AssetMetadataUpdate = z.infer<typeof assetMetadataUpdate>;

const assetFolderListResult = z.strictObject({
  folders: z.array(assetFolder),
});

export const assetFolderCreateRequest = z.strictObject({
  name: assetFolderName,
  parentId: assetFolderId.optional(),
});

export const assetFolderUpdateRequest = z
  .strictObject({
    name: assetFolderName.optional(),
    parentId: assetFolderId.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one asset folder field is required",
  });
export type AssetFolderUpdateRequest = z.infer<typeof assetFolderUpdateRequest>;

const assetFolderMutationResult = z.strictObject({
  folder: assetFolder,
});

const assetRestFailure = z.strictObject({
  errors: z.string().min(1),
});

const assetIndexRefreshResult = z.strictObject({
  scanned: z.number().int().nonnegative(),
  indexed: z.number().int().nonnegative(),
  metadataUpdated: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  removed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  inconsistent: z.number().int().nonnegative(),
  issues: z.array(
    z.strictObject({
      assetId: z.string(),
      storageName: z.string(),
      revision: z.string(),
      message: z.string(),
    })
  ),
});

type JsonSchema = Record<string, unknown>;

const rewriteLocalReferences = (value: unknown, component: string): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteLocalReferences(item, component));
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === "$ref" && typeof item === "string" && item.startsWith("#/$defs/")
        ? `#/components/schemas/${component}/${item.slice(2)}`
        : rewriteLocalReferences(item, component),
    ])
  );
};

const toComponentSchema = (
  component: string,
  schema: z.ZodType,
  io: "input" | "output"
): JsonSchema => {
  const { $schema: _schema, ...jsonSchema } = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io,
    unrepresentable: "any",
  });
  return rewriteLocalReferences(jsonSchema, component) as JsonSchema;
};

const toStandaloneSchema = (
  schema: z.ZodType,
  io: "input" | "output"
): JsonSchema => {
  const { $schema: _schema, ...jsonSchema } = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io,
    unrepresentable: "any",
  });
  return jsonSchema;
};

const inputComponentSchemas = {
  AssetQueryRequest: assetQueryRequest,
  AssetUploadReservationRequest: assetUploadReservationRequest,
  AssetMetadataUpdate: assetMetadataUpdate,
  AssetFolderCreateRequest: assetFolderCreateRequest,
  AssetFolderUpdateRequest: assetFolderUpdateRequest,
};

const outputComponentSchemas = {
  AssetQueryResult: assetQueryResult,
  AssetQueryPreviewResult: assetQueryPreviewResult,
  AssetResourceQueryFailure: assetResourceQueryFailure,
  BuilderAssetFieldCatalog: builderAssetFieldCatalog,
  AssetUploadTicket: assetUploadTicket,
  AssetUploadResult: assetUploadResult,
  AssetListResult: assetListResult,
  AssetItemResult: assetItemResult,
  AssetMutationResult: assetItemResult,
  AssetRestFailure: assetRestFailure,
  AssetIndexRefreshResult: assetIndexRefreshResult,
  AssetFolderListResult: assetFolderListResult,
  AssetFolderMutationResult: assetFolderMutationResult,
};

const createComponentSchemas = () =>
  Object.fromEntries([
    ...Object.entries(inputComponentSchemas).map(([name, schema]) => [
      name,
      toComponentSchema(name, schema, "input"),
    ]),
    ...Object.entries(outputComponentSchemas).map(([name, schema]) => [
      name,
      toComponentSchema(name, schema, "output"),
    ]),
  ]);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

const operatorLabels = new Map(
  assetQuerySourceDefinition.operators.map(({ value, label }) => [value, label])
);

const queryPropertyLabels: Record<string, string> = {
  result: "Result",
  where: "Filters",
  sort: "Sort",
  limit: "Limit",
  offset: "Offset",
  output: "Output",
  content: "Output",
  includeMetadata: "File metadata",
  maxBytes: "Maximum content bytes",
  length: "Content byte length",
};

const queryResultLabels: Readonly<Record<string, string>> = Object.fromEntries(
  assetQueryResultOptions.map(({ value, label }) => [value, label])
);

const queryModeLabels: Record<string, string> = {
  "output:all": "All content fields",
  "output:base": "File metadata only",
  "output:fields": "Selected fields",
  "content:none": "Metadata only",
  "content:markdown-body-ref": "Markdown body reference",
  "content:full": "Full file",
  "content:range": "Byte range",
};

type AssetOpenApiField = {
  path: string[];
  label?: string;
  types: readonly AssetObservedFieldType[];
};

const createAssetOpenApiFields = (
  catalog?: BuilderAssetFieldCatalog
): AssetOpenApiField[] => [
  ...assetQuerySourceDefinition.fields,
  ...Object.values(catalog?.fields ?? {}).flatMap((field) =>
    field.queryPath?.[0] === "properties"
      ? [
          {
            path: field.queryPath,
            types: field.types,
          },
        ]
      : []
  ),
];

const getSchemaChoices = (value: JsonSchema) =>
  Array.isArray(value.oneOf)
    ? value.oneOf
    : Array.isArray(value.anyOf)
      ? value.anyOf
      : undefined;

const isFilterConditionUnion = (value: unknown): value is JsonSchema => {
  if (isObject(value) === false) {
    return false;
  }
  const choices = getSchemaChoices(value);
  return (
    choices !== undefined &&
    choices.length > 0 &&
    choices.every(
      (item) =>
        isObject(item) &&
        isObject(item.properties) &&
        "field" in item.properties &&
        "operator" in item.properties &&
        "value" in item.properties
    )
  );
};

const findFilterConditionUnion = (value: unknown): JsonSchema | undefined => {
  if (isFilterConditionUnion(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFilterConditionUnion(item);
      if (found !== undefined) {
        return found;
      }
    }
    return;
  }
  if (isObject(value)) {
    for (const item of Object.values(value)) {
      const found = findFilterConditionUnion(item);
      if (found !== undefined) {
        return found;
      }
    }
  }
};

const decorateAssetQuerySchema = ({
  schema,
  fields,
  referenceRoot = "#/components/schemas/AssetQueryRequest",
}: {
  schema: JsonSchema;
  fields: readonly AssetOpenApiField[];
  referenceRoot?: string;
}): JsonSchema => {
  const definitionReference = (name: string) =>
    `${referenceRoot}/$defs/${name}`;
  const fieldGroups = new Map<
    string,
    {
      operators: AssetQueryOperator[];
      fields: AssetOpenApiField[];
      reference: string;
    }
  >();
  for (const field of fields) {
    const operators = getAssetQueryOperatorsForFieldTypes(field.types);
    const key = operators.join(",");
    const group = fieldGroups.get(key) ?? {
      operators,
      fields: [],
      reference: definitionReference(`AssetQueryField${fieldGroups.size}`),
    };
    group.fields.push(field);
    fieldGroups.set(key, group);
  }
  const allFieldsReference = definitionReference("AssetQueryField");
  const boundedWhereReference = definitionReference(
    `AssetQueryWhere${assetResourceLimits.filterDepth}`
  );
  let conditionSchema: JsonSchema | undefined;
  const fieldDefinitions = Object.fromEntries([
    [
      "AssetQueryField",
      {
        anyOf: [
          ...[...fieldGroups.values()].map(({ reference }) => ({
            $ref: reference,
          })),
          {
            type: "array",
            prefixItems: [{ const: "properties" }],
            items: { type: "string", minLength: 1 },
            minItems: 2,
            maxItems: assetResourceLimits.fieldPathDepth,
          },
        ],
      },
    ],
    ...[...fieldGroups.values()].map(({ fields: groupFields }, index) => [
      `AssetQueryField${index}`,
      {
        type: "array",
        minItems: 1,
        maxItems: assetResourceLimits.fieldPathDepth,
        items: { type: "string", minLength: 1 },
        oneOf: [
          ...groupFields.flatMap((field) =>
            field.label === undefined
              ? []
              : [{ const: field.path, title: field.label }]
          ),
          ...(() => {
            const paths = groupFields.flatMap((field) =>
              field.label === undefined ? [field.path] : []
            );
            return paths.length === 0 ? [] : [{ enum: paths }];
          })(),
        ],
      },
    ]),
  ]);

  const visit = (value: unknown, property?: string): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) => visit(item, property));
    }
    if (isObject(value) === false) {
      return value;
    }
    if (property === "where") {
      const next = visit(value) as JsonSchema;
      conditionSchema = findFilterConditionUnion(next);
      return {
        $ref: boundedWhereReference,
        ...(next.default === undefined ? {} : { default: next.default }),
        title: queryPropertyLabels.where,
        ...(typeof next.description === "string"
          ? { description: next.description }
          : {}),
      };
    }
    const next = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === "default" || key === "const" || key === "examples"
          ? item
          : key === "properties" && isObject(item)
            ? Object.fromEntries(
                Object.entries(item).map(([name, child]) => [
                  name,
                  visit(child, name),
                ])
              )
            : visit(item, property),
      ])
    );
    if (property !== undefined && queryPropertyLabels[property] !== undefined) {
      next.title = queryPropertyLabels[property];
    }
    if (
      property === "result" &&
      Array.isArray(next.enum) &&
      next.enum.every((value) => typeof value === "string")
    ) {
      next.oneOf = next.enum.map((value) => ({
        const: value,
        title: queryResultLabels[value] ?? value,
      }));
      delete next.enum;
      next["x-webstudio-section"] = "Result";
    }
    if (
      (property === "field" || property === "fields") &&
      next.type === "array" &&
      next.minItems === 1 &&
      isObject(next.items) &&
      next.items.type === "string"
    ) {
      return {
        $ref: allFieldsReference,
        ...(typeof next.title === "string" ? { title: next.title } : {}),
      };
    }
    if (
      next.type === "object" &&
      isObject(next.properties) &&
      isObject(next.properties.mode) &&
      typeof next.properties.mode.const === "string" &&
      property !== undefined
    ) {
      next.properties.mode.title =
        queryModeLabels[`${property}:${next.properties.mode.const}`] ??
        next.properties.mode.const;
    }
    if (property === "output" && Array.isArray(next.oneOf)) {
      next.oneOf.sort((left, right) => {
        const getMode = (item: unknown) =>
          isObject(item) &&
          isObject(item.properties) &&
          isObject(item.properties.mode) &&
          typeof item.properties.mode.const === "string"
            ? item.properties.mode.const
            : "";
        return (
          Number(getMode(right) === "base") - Number(getMode(left) === "base")
        );
      });
    }
    if (isFilterConditionUnion(next)) {
      const templates = getSchemaChoices(next) as Record<string, unknown>[];
      const choices = [...fieldGroups.values()].flatMap((group) =>
        templates.flatMap((template) => {
          if (isObject(template.properties) === false) {
            return [];
          }
          const operatorSchema = template.properties.operator;
          if (isObject(operatorSchema) === false) {
            return [];
          }
          const values = Array.isArray(operatorSchema.enum)
            ? operatorSchema.enum
            : [operatorSchema.const];
          const compatible = values.filter(
            (value): value is string =>
              typeof value === "string" &&
              group.operators.includes(value as AssetQueryOperator)
          );
          if (compatible.length === 0) {
            return [];
          }
          return [
            {
              ...template,
              properties: {
                ...template.properties,
                field: { $ref: group.reference },
                operator: {
                  oneOf: compatible.map((value) => ({
                    const: value,
                    title:
                      operatorLabels.get(value as AssetQueryOperator) ?? value,
                  })),
                },
              },
            },
          ];
        })
      );
      if (Array.isArray(next.oneOf)) {
        next.oneOf = choices;
      } else {
        next.anyOf = choices;
      }
    }
    return next;
  };
  const decorated = visit(schema) as JsonSchema;
  conditionSchema ??= findFilterConditionUnion(decorated);
  if (conditionSchema === undefined) {
    throw new Error("Asset query filter schema is missing");
  }
  const conditionReference = definitionReference("AssetQueryCondition");
  const whereDefinitions: Record<string, JsonSchema> = {
    AssetQueryCondition: conditionSchema,
  };
  for (let depth = 0; depth <= assetResourceLimits.filterDepth; depth += 1) {
    const choices: JsonSchema[] = [{ $ref: conditionReference }];
    if (depth > 0) {
      const childReference = definitionReference(`AssetQueryWhere${depth - 1}`);
      for (const combinator of ["all", "any"]) {
        choices.push({
          type: "object",
          properties: {
            [combinator]: {
              type: "array",
              maxItems: assetResourceLimits.filterCount,
              items: { $ref: childReference },
            },
          },
          required: [combinator],
          additionalProperties: false,
        });
      }
    }
    whereDefinitions[`AssetQueryWhere${depth}`] = { oneOf: choices };
  }
  return {
    ...decorated,
    $defs: {
      ...(isObject(decorated.$defs) ? decorated.$defs : {}),
      ...fieldDefinitions,
      ...whereDefinitions,
    },
  };
};

const getSerializedBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;

const findAssetQueryObjectSchema = (value: unknown): JsonSchema | undefined => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAssetQueryObjectSchema(item);
      if (found !== undefined) {
        return found;
      }
    }
    return;
  }
  if (isObject(value) === false) {
    return;
  }
  if (
    isObject(value.properties) &&
    ["result", "where", "sort", "limit", "offset", "output", "content"].every(
      (key) => Object.hasOwn(value.properties as object, key)
    )
  ) {
    return value;
  }
  for (const child of Object.values(value)) {
    const found = findAssetQueryObjectSchema(child);
    if (found !== undefined) {
      return found;
    }
  }
};

const createAssetQuerySchemaForFields = (fields: AssetOpenApiField[]) => ({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  ...decorateAssetQuerySchema({
    schema: toStandaloneSchema(assetQueryRequest, "input"),
    fields,
    referenceRoot: "#",
  }),
});

export const createAssetQueryJsonSchema = ({
  catalog,
}: {
  catalog?: BuilderAssetFieldCatalog;
}) => {
  const fields = createAssetOpenApiFields(catalog);
  const standardFieldCount = assetQuerySourceDefinition.fields.length;
  const standardFields = fields.slice(0, standardFieldCount);
  const dynamicFields = fields
    .slice(standardFieldCount)
    .map((field) => ({ field, key: JSON.stringify(field.path) }))
    .sort((left, right) => left.key.localeCompare(right.key))
    .map(({ field }) => field);
  const createBoundedSchema = (dynamicFieldCount: number) => {
    const schema = createAssetQuerySchemaForFields([
      ...standardFields,
      ...dynamicFields.slice(0, dynamicFieldCount),
    ]);
    if (dynamicFieldCount < dynamicFields.length) {
      const querySchema = findAssetQueryObjectSchema(schema);
      if (querySchema === undefined) {
        throw new Error("Asset query schema is missing");
      }
      querySchema.description = `Autocomplete includes ${dynamicFieldCount} of ${dynamicFields.length} observed content fields because the field catalog exceeds the API description limit. Other content fields remain valid.`;
    }
    return schema;
  };

  const completeSchema = createBoundedSchema(dynamicFields.length);
  if (
    getSerializedBytes(completeSchema) <=
    assetResourceLimits.apiDescriptionBytes
  ) {
    return completeSchema;
  }

  let minimum = 0;
  let maximum = dynamicFields.length - 1;
  let result = createBoundedSchema(0);
  if (getSerializedBytes(result) > assetResourceLimits.apiDescriptionBytes) {
    throw new Error(
      "Base asset query schema exceeds the API description limit"
    );
  }
  while (minimum <= maximum) {
    const count = Math.floor((minimum + maximum) / 2);
    const schema = createBoundedSchema(count);
    if (getSerializedBytes(schema) <= assetResourceLimits.apiDescriptionBytes) {
      result = schema;
      minimum = count + 1;
    } else {
      maximum = count - 1;
    }
  }
  return result;
};

const schemaResponse = (component: string, description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: `#/components/schemas/${component}` },
    },
  },
});

const mutationForbiddenResponse = {
  description: "Access denied or invalid CSRF token",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/AssetRestFailure" },
    },
    "text/plain": { schema: { type: "string" } },
  },
};

const errorResponses = {
  400: schemaResponse("AssetResourceQueryFailure", "Invalid request"),
  401: schemaResponse("AssetResourceQueryFailure", "Authentication required"),
  403: schemaResponse("AssetResourceQueryFailure", "Access denied"),
  409: schemaResponse("AssetResourceQueryFailure", "Stale asset index"),
  500: schemaResponse("AssetResourceQueryFailure", "Internal error"),
};

const restErrorResponses = {
  400: schemaResponse("AssetRestFailure", "Invalid request"),
  401: schemaResponse("AssetRestFailure", "Authentication required"),
  403: schemaResponse("AssetRestFailure", "Access denied"),
  500: schemaResponse("AssetRestFailure", "Internal error"),
};

const restNotFoundResponse = schemaResponse(
  "AssetRestFailure",
  "Asset or folder not found"
);

const mutationErrorResponses = {
  ...restErrorResponses,
  403: mutationForbiddenResponse,
  404: restNotFoundResponse,
  409: schemaResponse("AssetRestFailure", "Asset revision conflict"),
  413: schemaResponse("AssetRestFailure", "Request body too large"),
};

const pathParameter = (
  name: string,
  description: string,
  maxLength: number = assetResourceLimits.assetIdentifierCharacters
) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: {
    type: "string",
    minLength: 1,
    maxLength,
  },
});

const queryParameter = (
  name: string,
  description: string,
  required = false,
  maxLength: number = assetResourceLimits.assetIdentifierCharacters
) => ({
  name,
  in: "query",
  required,
  description,
  schema: {
    type: "string",
    minLength: 1,
    maxLength,
  },
});

const projectIdParameter = queryParameter("projectId", "Owning project", true);
const assetParameters = [
  pathParameter("assetId", "Asset ID"),
  projectIdParameter,
];
const assetFolderParameters = [
  pathParameter("folderId", "Asset folder ID"),
  projectIdParameter,
];
const binarySchema = { type: "string", format: "binary" } as const;
const assetContentResponseHeaders = {
  [assetContentDescriptorHeader]: {
    description:
      "URI-encoded JSON identity of the exact Asset revision in this response",
    schema: { type: "string" },
  },
};

/**
 * OpenAPI is both the transport description and the sole query-authoring
 * contract. The query UI derives its fields and controls from the operation's
 * standard request schema; no parallel provider-specific UI contract exists.
 */
export const createAssetResourceOpenApi = ({
  builderSessionCookieName,
  querySchemaReference,
}: {
  builderSessionCookieName: string;
  querySchemaReference: string;
}) => {
  const { AssetQueryRequest: _assetQueryRequest, ...componentSchemas } =
    createComponentSchemas();
  const operations = assetResourceApiOperations;
  const mutationSecurity = [
    { projectToken: [] },
    { builderSession: [], csrfToken: [] },
  ] as const;
  const document = {
    openapi: "3.1.1",
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    info: {
      title: "Webstudio Assets resource API",
      version: "1.0.0",
      description:
        "Public project Assets API for uploads, metadata and content mutations, queries, and bounded content hydration. Project-token authentication is intended for server-to-server clients; cross-origin browser token access is not enabled by default.",
    },
    "x-webstudio-limits": {
      mutationRequestBytes: assetResourceLimits.restMutationRequestBytes,
      filenameCharacters: assetResourceLimits.assetFilenameCharacters,
      descriptionCharacters: assetResourceLimits.assetDescriptionCharacters,
      folderNameCharacters: assetResourceLimits.assetFolderNameCharacters,
    },
    paths: {
      [operations.listAssets.path]: {
        [operations.listAssets.method]: {
          operationId: operations.listAssets.operationId,
          summary: "List project assets",
          parameters: [projectIdParameter],
          responses: {
            200: schemaResponse("AssetListResult", "Project assets"),
            ...restErrorResponses,
          },
        },
      },
      [operations.reserveAssetUpload.path]: {
        [operations.reserveAssetUpload.method]: {
          operationId: operations.reserveAssetUpload.operationId,
          summary: "Reserve an asset upload",
          security: mutationSecurity,
          description:
            "Supply contentHash when available so retries can reuse an existing identical asset instead of creating a duplicate reservation.",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  $ref: "#/components/schemas/AssetUploadReservationRequest",
                },
              },
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AssetUploadReservationRequest",
                },
              },
            },
          },
          responses: {
            200: schemaResponse("AssetUploadTicket", "Upload reservation"),
            ...mutationErrorResponses,
          },
        },
      },
      [operations.uploadAssetContent.path]: {
        [operations.uploadAssetContent.method]: {
          operationId: operations.uploadAssetContent.operationId,
          summary: "Upload asset content",
          security: mutationSecurity,
          description:
            "Upload a previously reserved storage name, or perform a direct API upload by supplying projectId and type. Direct uploads may also provide the optional metadata parameters.",
          parameters: [
            pathParameter(
              "name",
              "Reserved storage name or direct-upload filename",
              assetResourceLimits.assetFilenameCharacters
            ),
            queryParameter(
              "projectId",
              "Owning project; required for a direct API upload"
            ),
            {
              name: "type",
              in: "query",
              required: false,
              description: "Asset type; required for a direct API upload",
              schema: { type: "string", enum: assetType.options },
            },
            queryParameter("folderId", "Destination asset folder"),
            queryParameter(
              "format",
              "Detected file format override",
              false,
              assetResourceLimits.assetFilenameCharacters
            ),
            {
              name: "width",
              in: "query",
              required: false,
              description: "Image width in pixels",
              schema: { type: "number", exclusiveMinimum: 0 },
            },
            {
              name: "height",
              in: "query",
              required: false,
              description: "Image height in pixels",
              schema: { type: "number", exclusiveMinimum: 0 },
            },
            {
              name: "force",
              in: "query",
              required: false,
              description:
                "Create a new asset instead of deduplicating content",
              schema: { type: "boolean", default: false },
            },
            {
              name: "x-webstudio-asset-description",
              in: "header",
              required: false,
              description: "Asset description",
              schema: {
                type: "string",
                maxLength: assetResourceLimits.assetDescriptionCharacters,
              },
            },
            {
              name: "x-webstudio-asset-meta",
              in: "header",
              required: false,
              description: "JSON-encoded asset metadata override",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/octet-stream": {
                schema: binarySchema,
              },
            },
          },
          responses: {
            200: schemaResponse("AssetUploadResult", "Uploaded asset"),
            ...mutationErrorResponses,
          },
        },
      },
      [operations.updateAsset.path]: {
        [operations.getAsset.method]: {
          operationId: operations.getAsset.operationId,
          summary: "Get an asset",
          parameters: assetParameters,
          responses: {
            200: schemaResponse("AssetItemResult", "Asset record"),
            ...restErrorResponses,
            404: restNotFoundResponse,
          },
        },
        [operations.updateAsset.method]: {
          operationId: operations.updateAsset.operationId,
          summary: "Update asset metadata or folder",
          security: mutationSecurity,
          parameters: assetParameters,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssetMetadataUpdate" },
              },
            },
          },
          responses: {
            200: schemaResponse("AssetMutationResult", "Updated asset"),
            ...mutationErrorResponses,
          },
        },
        [operations.deleteAsset.method]: {
          operationId: operations.deleteAsset.operationId,
          summary: "Delete an asset",
          security: mutationSecurity,
          parameters: assetParameters,
          responses: {
            204: { description: "Asset deleted" },
            ...mutationErrorResponses,
          },
        },
      },
      [operations.replaceAssetContent.path]: {
        [operations.downloadAssetContent.method]: {
          operationId: operations.downloadAssetContent.operationId,
          summary: "Download asset content",
          description:
            "Streams the stored file through the authenticated Assets API. A single standard HTTP byte range is supported.",
          parameters: [
            pathParameter("assetId", "Asset ID"),
            projectIdParameter,
            {
              name: "Range",
              in: "header",
              required: false,
              description: "Single byte range, for example bytes=0-1023",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Complete asset content",
              headers: assetContentResponseHeaders,
              content: {
                "*/*": {
                  schema: binarySchema,
                },
              },
            },
            206: {
              description: "Partial asset content",
              headers: {
                ...assetContentResponseHeaders,
                "Content-Range": { schema: { type: "string" } },
              },
              content: {
                "*/*": {
                  schema: binarySchema,
                },
              },
            },
            416: schemaResponse("AssetRestFailure", "Invalid byte range"),
            ...restErrorResponses,
            404: restNotFoundResponse,
          },
        },
        [operations.replaceAssetContent.method]: {
          operationId: operations.replaceAssetContent.operationId,
          summary: "Replace editable asset content",
          security: mutationSecurity,
          parameters: [
            pathParameter("assetId", "Asset ID"),
            projectIdParameter,
            queryParameter(
              "expectedName",
              "Current immutable storage name used for conflict detection",
              true,
              assetResourceLimits.assetFilenameCharacters
            ),
          ],
          requestBody: {
            required: true,
            content: {
              "application/octet-stream": {
                schema: binarySchema,
              },
              "text/markdown": { schema: { type: "string" } },
              "text/mdx": { schema: { type: "string" } },
              "application/json": { schema: {} },
            },
          },
          responses: {
            200: schemaResponse("AssetMutationResult", "Updated asset"),
            ...mutationErrorResponses,
          },
        },
      },
      [operations.listAssetFolders.path]: {
        [operations.listAssetFolders.method]: {
          operationId: operations.listAssetFolders.operationId,
          summary: "List asset folders",
          parameters: [projectIdParameter],
          responses: {
            200: schemaResponse(
              "AssetFolderListResult",
              "Project asset folders"
            ),
            ...restErrorResponses,
          },
        },
        [operations.createAssetFolder.method]: {
          operationId: operations.createAssetFolder.operationId,
          summary: "Create an asset folder",
          security: mutationSecurity,
          parameters: [projectIdParameter],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AssetFolderCreateRequest",
                },
              },
            },
          },
          responses: {
            201: schemaResponse(
              "AssetFolderMutationResult",
              "Created asset folder"
            ),
            ...mutationErrorResponses,
          },
        },
      },
      [operations.updateAssetFolder.path]: {
        [operations.getAssetFolder.method]: {
          operationId: operations.getAssetFolder.operationId,
          summary: "Get an asset folder",
          parameters: assetFolderParameters,
          responses: {
            200: schemaResponse("AssetFolderMutationResult", "Asset folder"),
            ...restErrorResponses,
            404: restNotFoundResponse,
          },
        },
        [operations.updateAssetFolder.method]: {
          operationId: operations.updateAssetFolder.operationId,
          summary: "Update an asset folder",
          security: mutationSecurity,
          parameters: assetFolderParameters,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AssetFolderUpdateRequest",
                },
              },
            },
          },
          responses: {
            200: schemaResponse(
              "AssetFolderMutationResult",
              "Updated asset folder"
            ),
            ...mutationErrorResponses,
          },
        },
        [operations.deleteAssetFolder.method]: {
          operationId: operations.deleteAssetFolder.operationId,
          summary: "Delete an empty asset folder",
          security: mutationSecurity,
          description:
            "Returns a conflict when the folder contains nested folders or assets.",
          parameters: assetFolderParameters,
          responses: {
            204: { description: "Asset folder deleted" },
            ...mutationErrorResponses,
          },
        },
      },
      [operations.queryAssets.path]: {
        [operations.queryAssets.method]: {
          operationId: operations.queryAssets.operationId,
          summary: "Query project assets",
          parameters: [projectIdParameter],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: querySchemaReference },
              },
            },
          },
          responses: {
            200: schemaResponse("AssetQueryPreviewResult", "Query preview"),
            ...errorResponses,
          },
        },
      },
      [operations.getAssetFieldCatalog.path]: {
        [operations.getAssetFieldCatalog.method]: {
          operationId: operations.getAssetFieldCatalog.operationId,
          summary: "Get observed asset fields",
          parameters: [projectIdParameter],
          responses: {
            200: schemaResponse(
              "BuilderAssetFieldCatalog",
              "Observed project fields"
            ),
            400: errorResponses[400],
            401: errorResponses[401],
            403: errorResponses[403],
            500: errorResponses[500],
          },
        },
      },
      [operations.getAssetResourceOpenApi.path]: {
        [operations.getAssetResourceOpenApi.method]: {
          operationId: operations.getAssetResourceOpenApi.operationId,
          summary: "Get this OpenAPI description",
          parameters: [projectIdParameter],
          responses: {
            200: {
              description: "OpenAPI description",
              content: {
                "application/vnd.oai.openapi+json;version=3.1": {
                  schema: { type: "object", additionalProperties: true },
                },
              },
            },
            400: errorResponses[400],
            401: errorResponses[401],
            403: errorResponses[403],
            500: errorResponses[500],
          },
        },
      },
      [operations.getAssetQuerySchema.path]: {
        [operations.getAssetQuerySchema.method]: {
          operationId: operations.getAssetQuerySchema.operationId,
          summary: "Get the project Assets query schema",
          parameters: [projectIdParameter],
          responses: {
            200: {
              description: "Project-specific Assets query JSON Schema",
              content: {
                "application/schema+json": {
                  schema: { type: "object", additionalProperties: true },
                },
              },
            },
            400: errorResponses[400],
            401: errorResponses[401],
            403: errorResponses[403],
            500: errorResponses[500],
          },
        },
      },
      [operations.refreshAssetIndex.path]: {
        [operations.refreshAssetIndex.method]: {
          operationId: operations.refreshAssetIndex.operationId,
          summary: "Repair and refresh project asset metadata",
          security: mutationSecurity,
          description:
            "Re-reads missing or changed file metadata. A 503 response includes per-file issues when repair is incomplete.",
          parameters: [projectIdParameter],
          responses: {
            200: schemaResponse(
              "AssetIndexRefreshResult",
              "Asset metadata is synchronized"
            ),
            503: schemaResponse(
              "AssetIndexRefreshResult",
              "Asset metadata repair is incomplete"
            ),
            ...mutationErrorResponses,
          },
        },
      },
    },
    components: {
      schemas: componentSchemas,
      securitySchemes: {
        projectToken: {
          type: "apiKey",
          in: "header",
          name: "x-auth-token",
          description:
            "Webstudio project token with the permit required by the operation. The same capability token works in shared Builder sessions and API clients.",
        },
        builderSession: {
          type: "apiKey",
          in: "cookie",
          name: builderSessionCookieName,
          description:
            "Authenticated Webstudio Builder session. Cookie-authenticated mutations also require the Builder CSRF token.",
        },
        csrfToken: {
          type: "apiKey",
          in: "header",
          name: "X-CSRF-Token",
          description:
            "Builder CSRF token supplied by the authenticated Builder bootstrap. Required together with builderSession for mutations.",
        },
      },
    },
    security: [{ projectToken: [] }, { builderSession: [] }],
  } as const;

  const bytes = getSerializedBytes(document);
  if (bytes > assetResourceLimits.apiDescriptionBytes) {
    throw new Error(
      "Asset resource OpenAPI description exceeds the byte limit"
    );
  }
  return document;
};
