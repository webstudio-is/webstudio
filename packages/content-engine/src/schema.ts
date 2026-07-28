import { z } from "zod";
import {
  createQueryWhereSchema,
  getQueryFieldKey,
  getQueryWhereMetrics,
  type QueryWhereTree,
} from "@webstudio-is/query-builder";
import { contentEngineLimits } from "./limits";

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
  createdAt: z.string().datetime().optional(),
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

export type AssetObservedFieldType = z.infer<typeof assetObservedFieldType>;

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
          .max(contentEngineLimits.fieldPathDepth)
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

const sha256Revision = z.string().regex(/^sha256:[a-f0-9]{64}$/);

/** One query-independent metadata index shared by every Assets resource. */
export const contentArtifactV1 = z
  .strictObject({
    format: z.literal("webstudio-content-database"),
    version: z.literal(1),
    assetRevision: sha256Revision,
    documents: z.array(assetFileDocument),
    contents: z.record(z.string().min(1), z.string()).optional(),
    fieldCatalog: builderAssetFieldCatalog,
    database: z
      .strictObject({
        maxBytes: z.number().int().positive(),
        unboundedBytes: z.number().int().nonnegative(),
        sourceDocumentCount: z.number().int().nonnegative(),
      })
      .optional(),
    integrity: z.strictObject({
      algorithm: z.literal("sha256"),
      checksum: sha256Revision,
    }),
  })
  .superRefine((index, context) => {
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
      index.documents.map(({ contentRef }) => contentRef)
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
  });

export type ContentArtifactV1 = z.infer<typeof contentArtifactV1>;

export const assetResourceContentOptions = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }),
  z.object({
    mode: z.literal("full"),
    maxBytes: z
      .number()
      .int()
      .positive()
      .max(contentEngineLimits.hydratedFileBytes)
      .optional(),
  }),
  z.object({
    mode: z.literal("range"),
    offset: z.number().int().nonnegative(),
    length: z
      .number()
      .int()
      .positive()
      .max(contentEngineLimits.hydratedRangeBytes),
  }),
  z.object({
    mode: z.literal("markdown-body"),
    maxBytes: z
      .number()
      .int()
      .positive()
      .max(contentEngineLimits.hydratedFileBytes)
      .optional(),
  }),
]);

export type AssetResourceContentOptions = z.infer<
  typeof assetResourceContentOptions
>;

export const assetQueryStandardFieldTypes = {
  id: ["string"],
  name: ["string"],
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

const assetQueryStandardField = z.enum(assetQueryStandardFields);

export const assetQueryFieldPath = z
  .array(z.string().min(1))
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

export type AssetQueryFieldPath = z.infer<typeof assetQueryFieldPath>;

const includeMetadata = z.boolean().default(true);

export const assetResourceOutputSelection = z.discriminatedUnion("mode", [
  z.strictObject({
    mode: z.literal("all"),
    includeMetadata,
  }),
  z.strictObject({
    mode: z.literal("base"),
    includeMetadata,
  }),
  z.strictObject({
    mode: z.literal("fields"),
    includeMetadata,
    fields: z
      .array(assetQueryFieldPath)
      .max(contentEngineLimits.outputFieldCount)
      .refine(
        (fields) =>
          new Set(fields.map(getQueryFieldKey)).size === fields.length,
        { error: "Selected output fields must be unique" }
      ),
  }),
]);

export type AssetResourceOutputSelection = z.infer<
  typeof assetResourceOutputSelection
>;

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

const assetQueryValueFilter = z.strictObject({
  field: assetQueryFieldPath,
  operator: z.enum(assetQueryValueOperators),
  value: z.json(),
});

const assetQueryInFilter = z.strictObject({
  field: assetQueryFieldPath,
  operator: z.literal("in"),
  value: z.array(z.json()).max(contentEngineLimits.resultCount),
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

export type AssetQueryWhere = QueryWhereTree<AssetQueryFilter>;

const assetQueryWhereNode: z.ZodType<AssetQueryWhere, AssetQueryWhere> =
  createQueryWhereSchema(assetQueryFilter);

export const getAssetQueryWhereMetrics = (where: AssetQueryWhere) => {
  const { conditions, depth } = getQueryWhereMetrics(where);
  return { filters: conditions, depth };
};

const assetQueryWhere = assetQueryWhereNode.superRefine((where, context) => {
  const { filters, depth } = getAssetQueryWhereMetrics(where);
  if (filters > contentEngineLimits.filterCount) {
    context.addIssue({
      code: "custom",
      message: "Asset query exceeds the filter limit",
    });
  }
  if (depth > contentEngineLimits.filterDepth) {
    context.addIssue({
      code: "custom",
      message: "Asset query exceeds the filter nesting limit",
    });
  }
});

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

export const assetQuerySort = z.strictObject({
  field: assetQueryFieldPath,
  direction: z.enum(["asc", "desc"]),
});

export type AssetQuerySort = z.infer<typeof assetQuerySort>;

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

/**
 * Optional typed configuration for the existing Assets system resource.
 * An omitted configuration preserves the legacy fetch-all behavior.
 */
export const assetQuery = z
  .strictObject({
    where: assetQueryWhere.default({ all: [] }),
    sort: z
      .array(assetQuerySort)
      .max(contentEngineLimits.sortCount)
      .default([]),
    limit: z
      .number()
      .int()
      .nonnegative()
      .max(contentEngineLimits.resultCount)
      .default(contentEngineLimits.defaultResultCount),
    offset: z
      .number()
      .int()
      .nonnegative()
      .max(contentEngineLimits.candidateDocuments)
      .default(0),
    output: assetResourceOutputSelection.default({
      mode: "all",
      includeMetadata: true,
    }),
    content: assetResourceContentOptions.default({ mode: "none" }),
  })
  .refine(hasAssetQueryOutput, {
    error: "Select at least one asset query output",
  });

export type AssetQuery = z.infer<typeof assetQuery>;
export type AssetQueryInput = z.input<typeof assetQuery>;

export const assetQueryRequest = z.strictObject({
  query: assetQuery,
  indexRevision: z.string().min(1).max(255).optional(),
});

export type AssetQueryRequest = z.infer<typeof assetQueryRequest>;
export type AssetQueryRequestInput = z.input<typeof assetQueryRequest>;

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

const assetQueryContent = hydratedAssetContent.omit({
  _id: true,
  revision: true,
  contentRef: true,
});

export const assetQueryItem = assetFileDocument
  .omit({ _id: true, _type: true, contentRef: true })
  .partial()
  .extend({
    id: z.string().min(1).optional(),
    content: assetQueryContent.optional(),
  });

export type AssetQueryItem = z.infer<typeof assetQueryItem>;

export const contentDatabaseStats = z.strictObject({
  format: z.literal("webstudio-content-database"),
  version: z.literal(1),
  revision: sha256Revision,
  usedBytes: z.number().int().nonnegative(),
  maxBytes: z.number().int().positive(),
  unboundedBytes: z.number().int().nonnegative(),
  includedDocumentCount: z.number().int().nonnegative(),
  omittedDocumentCount: z.number().int().nonnegative(),
  truncated: z.boolean(),
});

export type ContentDatabaseStats = z.infer<typeof contentDatabaseStats>;

export const assetQueryResult = z.strictObject({
  items: z.array(assetQueryItem),
  totalCount: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  database: contentDatabaseStats.optional(),
});

export type AssetQueryResult = z.infer<typeof assetQueryResult>;

export const assetResourceErrorCode = z.enum([
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
