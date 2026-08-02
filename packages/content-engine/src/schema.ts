import {
  array,
  boolean,
  discriminatedUnion,
  enum as zEnum,
  json,
  literal,
  number,
  object,
  record,
  strictObject,
  string,
  type ZodType,
  type infer as Infer,
  type input as Input,
} from "zod";
import {
  createQueryWhereSchema,
  getQueryFieldKey,
  getQueryWhereMetrics,
  type QueryWhereTree,
} from "@webstudio-is/query-builder/runtime";
import { contentEngineLimits } from "./limits";
import { documentGraphArtifactV1 } from "./document-graph/graph-artifact";

const relativeAssetPath = string()
  .min(1)
  .refine((path) => path.startsWith("/") === false, {
    error: "Asset path must be relative",
  })
  .refine(
    (path) =>
      path.includes("\\") === false &&
      path
        .split("/")
        .every(
          (segment) => segment.length > 0 && segment !== ".." && segment !== "."
        ),
    { error: "Asset path must be normalized and must not contain dot segments" }
  );

/**
 * Lightweight file document exposed to asset-resource queries.
 *
 * Complete file content is deliberately represented by contentRef and is not
 * part of this query document.
 */
export const assetFileDocument = strictObject({
  _id: string().min(1),
  _type: literal("asset.file"),
  name: string().min(1),
  description: string().optional(),
  path: relativeAssetPath,
  key: string(),
  folderId: string().min(1).optional(),
  extension: string().regex(/^[a-z0-9]*$/),
  mimeType: string().min(1),
  size: number().int().nonnegative(),
  createdAt: string().datetime().optional(),
  revision: string().min(1),
  contentRef: string().min(1),
  properties: record(string(), json()),
  excerpt: string().optional(),
  metadataError: strictObject({
    code: string().min(1),
    message: string().min(1),
  }).optional(),
});

export type AssetFileDocument = Infer<typeof assetFileDocument>;

/** Query-specific document stored in a compiled content database. */
export const contentDatabaseDocument = assetFileDocument
  .partial()
  .required({ _id: true });

export type ContentDatabaseDocument = Infer<typeof contentDatabaseDocument>;

export const assetObservedFieldType = zEnum([
  "null",
  "boolean",
  "number",
  "string",
  "object",
  "array",
]);

export type AssetObservedFieldType = Infer<typeof assetObservedFieldType>;

export const builderAssetFieldCatalog = object({
  format: literal("webstudio-builder-asset-field-catalog"),
  version: literal(1),
  canonicalRevision: string().regex(/^sha256:[a-f0-9]{64}$/),
  documentCount: number().int().nonnegative(),
  fields: record(
    string().min(1),
    object({
      queryPath: array(string().min(1))
        .min(1)
        .max(contentEngineLimits.fieldPathDepth)
        .optional(),
      types: array(assetObservedFieldType).min(1),
      occurrences: number().int().positive(),
      optional: literal(true).optional(),
      mixed: literal(true).optional(),
    })
  ),
}).superRefine((catalog, context) => {
  for (const [path, field] of Object.entries(catalog.fields)) {
    const sortedTypes = [...new Set(field.types)].sort();
    if (JSON.stringify(field.types) !== JSON.stringify(sortedTypes)) {
      context.addIssue({
        code: "custom",
        path: ["fields", path, "types"],
        message: "Observed field types must be unique and sorted",
      });
    }
    if (field.occurrences > catalog.documentCount) {
      context.addIssue({
        code: "custom",
        path: ["fields", path, "occurrences"],
        message: "Field occurrences cannot exceed the document count",
      });
    }
    const optional = field.occurrences < catalog.documentCount;
    if ((field.optional === true) !== optional) {
      context.addIssue({
        code: "custom",
        path: ["fields", path, "optional"],
        message: "Field optionality must match its occurrence count",
      });
    }
    const mixed = sortedTypes.length > 1;
    if ((field.mixed === true) !== mixed) {
      context.addIssue({
        code: "custom",
        path: ["fields", path, "mixed"],
        message: "Mixed status must match the observed types",
      });
    }
  }
});

export type BuilderAssetFieldCatalog = Infer<typeof builderAssetFieldCatalog>;

const sha256Revision = string().regex(/^sha256:[a-f0-9]{64}$/);

export const materializedAssetQuery = strictObject({
  fields: array(
    array(string().min(1)).min(1).max(contentEngineLimits.fieldPathDepth)
  )
    .min(1)
    .max(contentEngineLimits.outputFieldCount + 1),
  rows: array(array(json())).max(contentEngineLimits.resultCount),
  totalCount: number()
    .int()
    .nonnegative()
    .max(contentEngineLimits.candidateDocuments),
  hasMore: boolean(),
}).superRefine(({ fields, rows }, context) => {
  for (const [index, row] of rows.entries()) {
    if (row.length !== fields.length) {
      context.addIssue({
        code: "custom",
        path: ["rows", index],
        message: "Materialized query rows must match the field count",
      });
    }
  }
});

export type MaterializedAssetQuery = Infer<typeof materializedAssetQuery>;

/** One compiled runtime database shared by all reachable Assets queries. */
export const contentArtifactV1 = strictObject({
  format: literal("webstudio-content-database"),
  version: literal(1),
  assetRevision: sha256Revision,
  documents: array(contentDatabaseDocument),
  documentGraph: documentGraphArtifactV1.optional(),
  contents: record(string().min(1), string()).optional(),
  assetReferences: record(
    string().min(1),
    array(
      strictObject({
        start: number().int().nonnegative(),
        end: number().int().positive(),
        assetId: string().min(1),
        suffix: string().min(1).optional(),
      }).refine(({ start, end }) => end > start, {
        message: "Markdown asset reference range must not be empty",
      })
    )
  ).optional(),
  fieldCatalog: builderAssetFieldCatalog,
  queries: record(sha256Revision, materializedAssetQuery).optional(),
  database: strictObject({
    maxBytes: number().int().positive(),
    unboundedBytes: number().int().nonnegative(),
    sourceDocumentCount: number().int().nonnegative(),
    includedDocumentCount: number().int().nonnegative().optional(),
  }).optional(),
  integrity: strictObject({
    algorithm: literal("sha256"),
    checksum: sha256Revision,
  }),
}).superRefine((index, context) => {
  if (index.documents.length > contentEngineLimits.candidateDocuments) {
    context.addIssue({
      code: "custom",
      path: ["documents"],
      message: "Asset index exceeds the document limit",
    });
  }
  if (
    index.fieldCatalog.canonicalRevision !== index.assetRevision ||
    index.fieldCatalog.documentCount !== index.documents.length
  ) {
    context.addIssue({
      code: "custom",
      path: ["fieldCatalog"],
      message: "Asset index field catalog does not match its documents",
    });
  }
  if (
    index.database !== undefined &&
    index.database.sourceDocumentCount < index.documents.length
  ) {
    context.addIssue({
      code: "custom",
      path: ["database", "sourceDocumentCount"],
      message: "Source document count cannot be smaller than the database",
    });
  }
  if (
    index.database?.includedDocumentCount !== undefined &&
    (index.database.includedDocumentCount < index.documents.length ||
      index.database.includedDocumentCount > index.database.sourceDocumentCount)
  ) {
    context.addIssue({
      code: "custom",
      path: ["database", "includedDocumentCount"],
      message: "Included document count must match the database bounds",
    });
  }
  let previousId: string | undefined;
  for (const [position, document] of index.documents.entries()) {
    if (previousId !== undefined && document._id <= previousId) {
      context.addIssue({
        code: "custom",
        path: ["documents", position, "_id"],
        message: "Asset index documents must have unique sorted IDs",
      });
    }
    previousId = document._id;
  }
  const contentRefs = new Set(
    index.documents.flatMap(({ contentRef }) =>
      contentRef === undefined ? [] : [contentRef]
    )
  );
  for (const contentRef of Object.keys(index.contents ?? {})) {
    if (contentRefs.has(contentRef) === false) {
      context.addIssue({
        code: "custom",
        path: ["contents", contentRef],
        message: "Embedded content must belong to an indexed document",
      });
    }
  }
  for (const contentRef of Object.keys(index.assetReferences ?? {})) {
    if (contentRefs.has(contentRef) === false) {
      context.addIssue({
        code: "custom",
        path: ["assetReferences", contentRef],
        message: "Asset references must belong to an indexed document",
      });
    }
  }
});

export type ContentArtifactV1 = Infer<typeof contentArtifactV1>;

export const assetResourceContentOptions = discriminatedUnion("mode", [
  object({ mode: literal("none") }),
  object({
    mode: literal("full"),
    maxBytes: number()
      .int()
      .positive()
      .max(contentEngineLimits.hydratedFileBytes)
      .optional(),
  }),
  object({
    mode: literal("range"),
    offset: number().int().nonnegative(),
    length: number()
      .int()
      .positive()
      .max(contentEngineLimits.hydratedRangeBytes),
  }),
  object({
    mode: literal("markdown-body-ref"),
    maxBytes: number()
      .int()
      .positive()
      .max(contentEngineLimits.hydratedFileBytes)
      .optional(),
  }),
]);

export type AssetResourceContentOptions = Infer<
  typeof assetResourceContentOptions
>;

export const assetQueryStandardFieldTypes = {
  id: ["string"],
  url: ["string"],
  width: ["number"],
  height: ["number"],
  name: ["string"],
  description: ["string"],
  path: ["string"],
  key: ["string"],
  folderId: ["string"],
  extension: ["string"],
  mimeType: ["string"],
  size: ["number"],
  createdAt: ["string"],
  revision: ["string"],
  excerpt: ["string"],
} as const satisfies Record<string, readonly AssetObservedFieldType[]>;

export const assetQueryStandardFields = Object.keys(
  assetQueryStandardFieldTypes
) as [keyof typeof assetQueryStandardFieldTypes];

export const assetQueryRuntimeFields = ["url", "width", "height"] as const;
export const isAssetQueryRuntimeField = (
  field: string
): field is (typeof assetQueryRuntimeFields)[number] =>
  (assetQueryRuntimeFields as readonly string[]).includes(field);

export const assetQueryMetadataFields = assetQueryStandardFields.filter(
  (field) => isAssetQueryRuntimeField(field) === false && field !== "excerpt"
);
export const assetQueryDocumentFields = assetQueryMetadataFields.filter(
  (field) => field !== "id"
);
export const isAssetQueryMetadataField = (field: string) =>
  (assetQueryMetadataFields as readonly string[]).includes(field);

const assetQueryStandardField = zEnum(assetQueryStandardFields);

export const assetQueryFieldPath = array(string().min(1))
  .min(1)
  .max(contentEngineLimits.fieldPathDepth)
  .superRefine((path, context) => {
    if (path[0] === "properties") {
      if (path.length < 2) {
        context.addIssue({
          code: "custom",
          message: "A properties field path must select a property",
        });
      }
      return;
    }
    if (
      path.length !== 1 ||
      assetQueryStandardField.safeParse(path[0]).success === false
    ) {
      context.addIssue({
        code: "custom",
        message: "Asset query field path is unsupported",
      });
    }
  });

export type AssetQueryFieldPath = Infer<typeof assetQueryFieldPath>;

const includeMetadata = boolean().default(true);

export const assetResourceOutputSelection = discriminatedUnion("mode", [
  strictObject({
    mode: literal("all"),
    includeMetadata,
  }),
  strictObject({
    mode: literal("base"),
    includeMetadata,
  }),
  strictObject({
    mode: literal("fields"),
    includeMetadata,
    fields: array(assetQueryFieldPath)
      .max(contentEngineLimits.outputFieldCount)
      .refine(
        (fields) =>
          new Set(fields.map(getQueryFieldKey)).size === fields.length,
        { error: "Selected output fields must be unique" }
      ),
  }),
]);

export type AssetResourceOutputSelection = Infer<
  typeof assetResourceOutputSelection
>;

export const defaultAssetResourceOutputSelection = {
  mode: "fields",
  includeMetadata: false,
  fields: assetQueryRuntimeFields.map((field) => [field]),
} as const satisfies AssetResourceOutputSelection;

export const assetQueryValueOperators = [
  "eq",
  "ne",
  "contains",
  "startsWith",
  "endsWith",
  "gt",
  "gte",
  "lt",
  "lte",
] as const;
export const assetQueryOperators = [
  ...assetQueryValueOperators,
  "in",
  "exists",
  "isEmpty",
] as const;
export type AssetQueryOperator = (typeof assetQueryOperators)[number];

const assetQueryValueFilter = strictObject({
  field: assetQueryFieldPath,
  operator: zEnum(assetQueryValueOperators),
  value: json(),
});

const assetQueryInFilter = strictObject({
  field: assetQueryFieldPath,
  operator: literal("in"),
  value: array(json()).max(contentEngineLimits.resultCount),
});

const assetQueryBooleanFilter = strictObject({
  field: assetQueryFieldPath,
  operator: zEnum(["exists", "isEmpty"]),
  value: boolean(),
});

export const assetQueryFilter = discriminatedUnion("operator", [
  assetQueryValueFilter,
  assetQueryInFilter,
  assetQueryBooleanFilter,
]);

export type AssetQueryFilter = Infer<typeof assetQueryFilter>;

export type AssetQueryWhere = QueryWhereTree<AssetQueryFilter>;

const assetQueryWhereNode: ZodType<AssetQueryWhere, AssetQueryWhere> =
  createQueryWhereSchema(assetQueryFilter, {
    maximumChildren: contentEngineLimits.filterCount,
    maximumConditions: contentEngineLimits.filterCount,
    maximumDepth: contentEngineLimits.filterDepth,
    maximumConditionsMessage: "Asset query exceeds the filter limit",
    maximumDepthMessage: "Asset query exceeds the filter nesting limit",
  });

export const getAssetQueryWhereMetrics = (where: AssetQueryWhere) => {
  const { conditions, depth } = getQueryWhereMetrics(where);
  return { filters: conditions, depth };
};

const assetQueryWhere = assetQueryWhereNode;

export const getAssetQueryOperatorsForFieldTypes = (
  fieldTypes: readonly AssetObservedFieldType[]
) => {
  const operators = new Set<AssetQueryOperator>(["eq", "ne", "in", "exists"]);
  if (fieldTypes.some((type) => type === "string" || type === "array")) {
    operators.add("contains");
  }
  if (fieldTypes.includes("string")) {
    operators.add("startsWith");
    operators.add("endsWith");
  }
  if (fieldTypes.some((type) => type === "string" || type === "number")) {
    operators.add("gt");
    operators.add("gte");
    operators.add("lt");
    operators.add("lte");
  }
  if (
    fieldTypes.some(
      (type) => type === "string" || type === "array" || type === "object"
    )
  ) {
    operators.add("isEmpty");
  }
  return [...operators];
};

export const assetQuerySort = strictObject({
  field: assetQueryFieldPath,
  direction: zEnum(["asc", "desc"]),
});

export type AssetQuerySort = Infer<typeof assetQuerySort>;

export const hasAssetQueryOutput = ({
  output,
  content,
}: {
  output: AssetResourceOutputSelection;
  content: AssetResourceContentOptions;
}) =>
  output.includeMetadata ||
  output.mode === "all" ||
  (output.mode === "fields" && output.fields.length > 0) ||
  content.mode !== "none";

/** Typed configuration for the query mode of the Assets system resource. */
export const assetQuery = strictObject({
  where: assetQueryWhere.default({ all: [] }),
  sort: array(assetQuerySort).max(contentEngineLimits.sortCount).default([]),
  limit: number()
    .int()
    .nonnegative()
    .max(contentEngineLimits.resultCount)
    .default(contentEngineLimits.defaultResultCount),
  offset: number()
    .int()
    .nonnegative()
    .max(contentEngineLimits.candidateDocuments)
    .default(0),
  output: assetResourceOutputSelection.default(
    defaultAssetResourceOutputSelection
  ),
  content: assetResourceContentOptions.default({ mode: "none" }),
}).refine(hasAssetQueryOutput, {
  error: "Select at least one asset query output",
});

export type AssetQuery = Infer<typeof assetQuery>;
export type AssetQueryInput = Input<typeof assetQuery>;

export const assetQueryRequest = strictObject({
  query: assetQuery,
  indexRevision: string().min(1).max(255).optional(),
});

export type AssetQueryRequest = Infer<typeof assetQueryRequest>;
export type AssetQueryRequestInput = Input<typeof assetQueryRequest>;

export const hydratedAssetContent = object({
  _id: string().min(1),
  revision: string().min(1),
  contentRef: string().min(1),
  encoding: literal("utf-8"),
  text: string(),
  range: object({
    offset: number().int().nonnegative(),
    length: number().int().nonnegative(),
    total: number().int().nonnegative(),
  }).optional(),
});

export type HydratedAssetContent = Infer<typeof hydratedAssetContent>;

const assetQueryContent = hydratedAssetContent.omit({
  _id: true,
  revision: true,
  contentRef: true,
});

export const assetQueryItem = assetFileDocument
  .omit({ _id: true, _type: true, contentRef: true })
  .partial()
  .extend({
    // Identity is part of the Assets resource structure, independently of the
    // fields selected for each value.
    id: string().min(1),
    url: string().min(1).optional(),
    width: number().positive().optional(),
    height: number().positive().optional(),
    content: assetQueryContent.optional(),
  })
  .refine(
    (item) => (item.width === undefined) === (item.height === undefined),
    { error: "Asset dimensions must include both width and height" }
  );

export type AssetQueryItem = Infer<typeof assetQueryItem>;

export const contentDatabaseStats = strictObject({
  format: literal("webstudio-content-database"),
  version: literal(1),
  revision: sha256Revision,
  usedBytes: number().int().nonnegative(),
  maxBytes: number().int().positive(),
  unboundedBytes: number().int().nonnegative(),
  includedDocumentCount: number().int().nonnegative(),
  omittedDocumentCount: number().int().nonnegative(),
  omissionReason: zEnum(["size", "unavailable"]).optional(),
  truncated: boolean(),
});

export type ContentDatabaseStats = Infer<typeof contentDatabaseStats>;

const contentDatabaseCapacityStats = contentDatabaseStats.pick({
  usedBytes: true,
  maxBytes: true,
  unboundedBytes: true,
  includedDocumentCount: true,
  omittedDocumentCount: true,
  omissionReason: true,
  truncated: true,
});

export const assetQueryResult = strictObject({
  items: array(assetQueryItem),
  totalCount: number().int().nonnegative(),
  hasMore: boolean(),
});

export type AssetQueryResult = Infer<typeof assetQueryResult>;

export const assetQueryPreviewDiagnostics = strictObject({
  scope: literal("query-preview"),
  query: contentDatabaseCapacityStats,
  database: contentDatabaseCapacityStats,
  artifacts: strictObject({
    query: contentArtifactV1,
    database: contentArtifactV1,
  }).optional(),
  unresolved: assetQueryResult.optional(),
});

export type AssetQueryPreviewDiagnostics = Infer<
  typeof assetQueryPreviewDiagnostics
>;

export const assetQueryPreviewResult = strictObject({
  data: assetQueryResult,
  __diagnostics__: assetQueryPreviewDiagnostics,
});

export type AssetQueryPreviewResult = Infer<typeof assetQueryPreviewResult>;

export const assetResourceErrorCode = zEnum([
  "INVALID_REQUEST",
  "REQUEST_CANCELLED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "STALE_INDEX",
  "CONTENT_IDENTITY_REQUIRED",
  "CONTENT_NOT_TEXT",
  "CONTENT_DECODING_FAILED",
  "CONTENT_LIMIT_EXCEEDED",
  "INTERNAL_ERROR",
]);

export type AssetResourceErrorCode = Infer<typeof assetResourceErrorCode>;

export const assetResourceQueryFailure = object({
  ok: literal(false),
  error: object({
    code: assetResourceErrorCode,
    message: string().min(1),
    retryable: boolean(),
    details: record(string(), json()).optional(),
  }),
  meta: object({
    queryHash: string().min(1).optional(),
    indexRevision: string().min(1).optional(),
    assetRevision: string().min(1).optional(),
  }).optional(),
});

export type AssetResourceQueryFailure = Infer<typeof assetResourceQueryFailure>;

export const createAssetResourceQueryFailure = ({
  code,
  message,
  retryable = false,
  details,
}: AssetResourceQueryFailure["error"]) =>
  assetResourceQueryFailure.parse({
    ok: false,
    error: { code, message, retryable, details },
  });
