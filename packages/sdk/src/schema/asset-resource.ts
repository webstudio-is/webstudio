import { z } from "zod";

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

export const assetResourceLimits = {
  queryBytes: 32 * 1024,
  queryAstNodes: 1000,
  queryAstDepth: 64,
  queryRuntimeMs: 250,
  parameterCount: 32,
  parameterBytes: 64 * 1024,
  defaultResultCount: 100,
  resultCount: 1000,
  resultBytes: 1024 * 1024,
  candidateDocuments: 5000,
  indexBytes: 16 * 1024 * 1024,
  frontmatterBytes: 64 * 1024,
  frontmatterDepth: 8,
  frontmatterFields: 256,
  frontmatterStringBytes: 16 * 1024,
  excerptBytes: 2 * 1024,
  hydratedFileBytes: 1024 * 1024,
  hydratedTotalBytes: 2 * 1024 * 1024,
  hydratedFileCount: 20,
  hydratedRangeBytes: 256 * 1024,
  concurrentContentReads: 8,
} as const;

const sha256Revision = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const assetResourceIndexV1 = z
  .strictObject({
    format: z.literal("webstudio-resource-index"),
    version: z.literal(1),
    resourceId: z.string().min(1),
    queryHash: sha256Revision,
    assetRevision: sha256Revision,
    queryMode: z.enum(["static", "parameterized"]),
    parameterNames: z
      .array(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/))
      .max(assetResourceLimits.parameterCount),
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
    const sortedParameterNames = [...new Set(index.parameterNames)].sort();
    if (
      JSON.stringify(index.parameterNames) !==
      JSON.stringify(sortedParameterNames)
    ) {
      context.addIssue({
        code: "custom",
        path: ["parameterNames"],
        message: "Resource index parameter names must be unique and sorted",
      });
    }
    if (
      (index.queryMode === "static" && index.parameterNames.length !== 0) ||
      (index.queryMode === "parameterized" && index.parameterNames.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["queryMode"],
        message: "Resource index query mode must match its parameters",
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

export const assetResourceQueryRequest = z.object({
  query: z
    .string()
    .min(1)
    .max(assetResourceLimits.queryBytes)
    .refine(
      (query) => getUtf8ByteLength(query) <= assetResourceLimits.queryBytes,
      { error: "Asset resource query exceeds the UTF-8 byte limit" }
    ),
  parameters: z
    .record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), z.json())
    .refine(
      (parameters) =>
        Object.keys(parameters).length <= assetResourceLimits.parameterCount,
      { error: "Too many asset resource parameters" }
    )
    .refine(
      (parameters) =>
        getUtf8ByteLength(JSON.stringify(parameters)) <=
        assetResourceLimits.parameterBytes,
      { error: "Asset resource parameters exceed the JSON byte limit" }
    )
    .default({}),
  resultLimit: z
    .number()
    .int()
    .positive()
    .max(assetResourceLimits.resultCount)
    .default(assetResourceLimits.defaultResultCount),
  indexRevision: z.string().min(1).optional(),
  content: assetResourceContentOptions.default({ mode: "none" }),
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

export const assetResourceQuerySuccess = z.object({
  ok: z.literal(true),
  result: z.json(),
  content: z.record(z.string(), hydratedAssetContent),
  meta: z.object({
    queryHash: z.string().min(1),
    indexRevision: z.string().min(1),
    assetRevision: z.string().min(1),
    resultCount: z.number().int().nonnegative(),
    hydratedFileCount: z.number().int().nonnegative(),
    hydratedBytes: z.number().int().nonnegative(),
  }),
});

export type AssetResourceQuerySuccess = z.infer<
  typeof assetResourceQuerySuccess
>;

export const assetResourceErrorCode = z.enum([
  "INVALID_REQUEST",
  "INVALID_QUERY",
  "MISSING_PARAMETER",
  "REQUEST_CANCELLED",
  "REQUEST_TIMEOUT",
  "NETWORK_ERROR",
  "FORBIDDEN",
  "NOT_FOUND",
  "STALE_INDEX",
  "INDEX_NOT_FOUND",
  "INDEX_BUILD_FAILED",
  "QUERY_COMPLEXITY_EXCEEDED",
  "QUERY_TIMEOUT",
  "RESULT_LIMIT_EXCEEDED",
  "RESULT_SIZE_EXCEEDED",
  "CONTENT_IDENTITY_REQUIRED",
  "CONTENT_NOT_TEXT",
  "CONTENT_DECODING_FAILED",
  "CONTENT_LIMIT_EXCEEDED",
  "PROTECTED_CONTENT",
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
