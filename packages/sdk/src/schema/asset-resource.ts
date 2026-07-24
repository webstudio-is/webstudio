import { z } from "zod";
export { assetResourceLimits } from "../asset-resource-limits";
import { assetResourceLimits } from "../asset-resource-limits";

const relativeAssetPath = z
  .string()
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
export const assetFileDocument = z.strictObject({
  _id: z.string().min(1),
  _type: z.literal("asset.file"),
  name: z.string().min(1),
  path: relativeAssetPath,
  key: z.string(),
  folderId: z.string().min(1).optional(),
  extension: z.string().regex(/^[a-z0-9]*$/),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  revision: z.string().min(1),
  contentRef: z.string().min(1),
  properties: z.record(z.string(), z.json()),
  excerpt: z.string().optional(),
  metadataError: z
    .strictObject({
      code: z.string().min(1),
      message: z.string().min(1),
    })
    .optional(),
});

export type AssetFileDocument = z.infer<typeof assetFileDocument>;

export const assetObservedFieldType = z.enum([
  "null",
  "boolean",
  "number",
  "string",
  "object",
  "array",
]);

export const builderAssetFieldCatalog = z
  .object({
    format: z.literal("webstudio-builder-asset-field-catalog"),
    version: z.literal(1),
    canonicalRevision: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    documentCount: z.number().int().nonnegative(),
    fields: z.record(
      z.string().min(1),
      z.object({
        queryPath: z
          .array(z.string().min(1))
          .min(1)
          .max(assetResourceLimits.fieldPathDepth)
          .optional(),
        types: z.array(assetObservedFieldType).min(1),
        occurrences: z.number().int().positive(),
        optional: z.literal(true).optional(),
        mixed: z.literal(true).optional(),
      })
    ),
  })
  .superRefine((catalog, context) => {
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

export type BuilderAssetFieldCatalog = z.infer<typeof builderAssetFieldCatalog>;

export const assetResourceIndexStatus = z
  .strictObject({
    resourceId: z.string().min(1),
    state: z.enum(["indexing", "stale", "failed", "active"]),
    queryHash: z.string().min(1),
    assetRevision: z.string().min(1),
    activeRevision: z.string().min(1).optional(),
    error: z.record(z.string(), z.json()).optional(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .superRefine((status, context) => {
    if (status.state === "active" && status.activeRevision === undefined) {
      context.addIssue({
        code: "custom",
        path: ["activeRevision"],
        message: "An active resource index requires an active revision",
      });
    }
  });

export type AssetResourceIndexStatus = z.infer<typeof assetResourceIndexStatus>;

const sha256Revision = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const assetResourceVariableName = z
  .string()
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/);

export const assetResourceIndexV1 = z
  .strictObject({
    format: z.literal("webstudio-resource-index"),
    version: z.literal(1),
    resourceId: z.string().min(1),
    queryHash: sha256Revision,
    assetRevision: sha256Revision,
    plan: z.json(),
    documents: z.array(assetFileDocument),
    integrity: z.strictObject({
      algorithm: z.literal("sha256"),
      checksum: sha256Revision,
    }),
  })
  .superRefine((index, context) => {
    if (index.documents.length > assetResourceLimits.candidateDocuments) {
      context.addIssue({
        code: "custom",
        path: ["documents"],
        message: "Resource index exceeds the candidate document limit",
      });
    }
    if (
      typeof index.plan !== "object" ||
      index.plan === null ||
      Array.isArray(index.plan) ||
      Reflect.get(index.plan, "queryHash") !== index.queryHash ||
      Reflect.get(index.plan, "assetRevision") !== index.assetRevision
    ) {
      context.addIssue({
        code: "custom",
        path: ["plan"],
        message: "Resource index query plan identity must match the index",
      });
    }
    let previousId: string | undefined;
    for (const [position, document] of index.documents.entries()) {
      if (previousId !== undefined && document._id <= previousId) {
        context.addIssue({
          code: "custom",
          path: ["documents", position, "_id"],
          message: "Resource index documents must have unique sorted IDs",
        });
      }
      previousId = document._id;
    }
  });

export type AssetResourceIndexV1 = z.infer<typeof assetResourceIndexV1>;

/** One query-independent metadata index shared by every Assets resource. */
export const assetIndexV1 = z
  .strictObject({
    format: z.literal("webstudio-asset-index"),
    version: z.literal(1),
    assetRevision: sha256Revision,
    documents: z.array(assetFileDocument),
    fieldCatalog: builderAssetFieldCatalog,
    integrity: z.strictObject({
      algorithm: z.literal("sha256"),
      checksum: sha256Revision,
    }),
  })
  .superRefine((index, context) => {
    if (index.documents.length > assetResourceLimits.candidateDocuments) {
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
  });

export type AssetIndexV1 = z.infer<typeof assetIndexV1>;

const getUtf8ByteLength = (value: string) =>
  new TextEncoder().encode(value).byteLength;

export const assetResourceContentOptions = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }),
  z.object({
    mode: z.literal("full"),
    maxBytes: z
      .number()
      .int()
      .positive()
      .max(assetResourceLimits.hydratedFileBytes)
      .optional(),
  }),
  z.object({
    mode: z.literal("range"),
    offset: z.number().int().nonnegative(),
    length: z
      .number()
      .int()
      .positive()
      .max(assetResourceLimits.hydratedRangeBytes),
  }),
  z.object({
    mode: z.literal("markdown-body"),
    maxBytes: z
      .number()
      .int()
      .positive()
      .max(assetResourceLimits.hydratedFileBytes)
      .optional(),
  }),
]);

export type AssetResourceContentOptions = z.infer<
  typeof assetResourceContentOptions
>;

const assetQueryStandardField = z.enum([
  "id",
  "name",
  "path",
  "key",
  "folderId",
  "extension",
  "mimeType",
  "size",
  "revision",
  "excerpt",
]);

export const assetQueryFieldPath = z
  .array(z.string().min(1))
  .min(1)
  .max(assetResourceLimits.fieldPathDepth)
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

export type AssetQueryFieldPath = z.infer<typeof assetQueryFieldPath>;

const assetQueryValueFilter = z.strictObject({
  field: assetQueryFieldPath,
  operator: z.enum([
    "eq",
    "ne",
    "contains",
    "startsWith",
    "endsWith",
    "gt",
    "gte",
    "lt",
    "lte",
  ]),
  value: z.json(),
});

const assetQueryInFilter = z.strictObject({
  field: assetQueryFieldPath,
  operator: z.literal("in"),
  value: z.array(z.json()).max(assetResourceLimits.resultCount),
});

const assetQueryBooleanFilter = z.strictObject({
  field: assetQueryFieldPath,
  operator: z.enum(["exists", "isEmpty"]),
  value: z.boolean(),
});

export const assetQueryFilter = z.discriminatedUnion("operator", [
  assetQueryValueFilter,
  assetQueryInFilter,
  assetQueryBooleanFilter,
]);

export type AssetQueryFilter = z.infer<typeof assetQueryFilter>;

export const assetQuerySort = z.strictObject({
  field: assetQueryFieldPath,
  direction: z.enum(["asc", "desc"]),
});

export type AssetQuerySort = z.infer<typeof assetQuerySort>;

/**
 * Optional typed configuration for the existing Assets system resource.
 * An omitted configuration preserves the legacy fetch-all behavior.
 */
export const assetQuery = z.strictObject({
  filters: z
    .array(assetQueryFilter)
    .max(assetResourceLimits.filterCount)
    .default([]),
  sort: z.array(assetQuerySort).max(assetResourceLimits.sortCount).default([]),
  limit: z
    .number()
    .int()
    .nonnegative()
    .max(assetResourceLimits.resultCount)
    .default(assetResourceLimits.defaultResultCount),
  offset: z
    .number()
    .int()
    .nonnegative()
    .max(assetResourceLimits.candidateDocuments)
    .default(0),
  content: assetResourceContentOptions.default({ mode: "none" }),
});

export type AssetQuery = z.infer<typeof assetQuery>;
export type AssetQueryInput = z.input<typeof assetQuery>;

export const assetQueryRequest = z.strictObject({
  query: assetQuery,
  indexRevision: z.string().min(1).max(255).optional(),
});

export type AssetQueryRequest = z.infer<typeof assetQueryRequest>;
export type AssetQueryRequestInput = z.input<typeof assetQueryRequest>;

export const assetResourceQueryRequest = z.object({
  query: z
    .string()
    .min(1)
    .max(assetResourceLimits.queryBytes)
    .refine(
      (query) => getUtf8ByteLength(query) <= assetResourceLimits.queryBytes,
      { error: "Asset resource query exceeds the UTF-8 byte limit" }
    ),
  variables: z
    .record(assetResourceVariableName, z.json())
    .refine(
      (variables) =>
        Object.keys(variables).length <= assetResourceLimits.variableCount,
      { error: "Too many asset resource variables" }
    )
    .refine(
      (variables) =>
        getUtf8ByteLength(JSON.stringify(variables)) <=
        assetResourceLimits.variableBytes,
      { error: "Asset resource variables exceed the JSON byte limit" }
    )
    .default({}),
  operationName: assetResourceVariableName.max(255).optional(),
  indexRevision: z.string().min(1).max(255).optional(),
});

export type AssetResourceQueryRequest = z.infer<
  typeof assetResourceQueryRequest
>;
export type AssetResourceQueryInput = z.input<typeof assetResourceQueryRequest>;

export const hydratedAssetContent = z.object({
  _id: z.string().min(1),
  revision: z.string().min(1),
  contentRef: z.string().min(1),
  encoding: z.literal("utf-8"),
  text: z.string(),
  range: z
    .object({
      offset: z.number().int().nonnegative(),
      length: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    })
    .optional(),
});

export type HydratedAssetContent = z.infer<typeof hydratedAssetContent>;

export const assetQueryContent = hydratedAssetContent.omit({
  _id: true,
  revision: true,
  contentRef: true,
});

export type AssetQueryContent = z.infer<typeof assetQueryContent>;

export const assetQueryItem = assetFileDocument
  .omit({ _id: true, _type: true, contentRef: true })
  .extend({
    id: z.string().min(1),
    content: assetQueryContent.optional(),
  });

export type AssetQueryItem = z.infer<typeof assetQueryItem>;

export const assetQueryResult = z.strictObject({
  items: z.array(assetQueryItem),
  totalCount: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export type AssetQueryResult = z.infer<typeof assetQueryResult>;

export const assetResourceQuerySuccess = z.object({
  ok: z.literal(true),
  data: z.json(),
  meta: z.object({
    queryHash: z.string().min(1),
    indexRevision: z.string().min(1),
    assetRevision: z.string().min(1),
  }),
});

export type AssetResourceQuerySuccess = z.infer<
  typeof assetResourceQuerySuccess
>;

export const assetResourceErrorCode = z.enum([
  "INVALID_REQUEST",
  "INVALID_QUERY",
  "REQUEST_CANCELLED",
  "REQUEST_TIMEOUT",
  "NETWORK_ERROR",
  "FORBIDDEN",
  "NOT_FOUND",
  "STALE_INDEX",
  "INDEX_NOT_FOUND",
  "INDEX_BUILD_FAILED",
  "QUERY_COMPLEXITY_EXCEEDED",
  "RESULT_SIZE_EXCEEDED",
  "CONTENT_IDENTITY_REQUIRED",
  "CONTENT_NOT_TEXT",
  "CONTENT_DECODING_FAILED",
  "CONTENT_LIMIT_EXCEEDED",
  "INTERNAL_ERROR",
]);

export type AssetResourceErrorCode = z.infer<typeof assetResourceErrorCode>;

export const assetResourceQueryFailure = z.object({
  ok: z.literal(false),
  error: z.object({
    code: assetResourceErrorCode,
    message: z.string().min(1),
    retryable: z.boolean(),
    details: z.record(z.string(), z.json()).optional(),
  }),
  meta: z
    .object({
      queryHash: z.string().min(1).optional(),
      indexRevision: z.string().min(1).optional(),
      assetRevision: z.string().min(1).optional(),
    })
    .optional(),
});

export type AssetResourceQueryFailure = z.infer<
  typeof assetResourceQueryFailure
>;

export const assetResourceQueryResponse = z.discriminatedUnion("ok", [
  assetResourceQuerySuccess,
  assetResourceQueryFailure,
]);

export type AssetResourceQueryResponse = z.infer<
  typeof assetResourceQueryResponse
>;
