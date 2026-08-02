import {
  getQueryConditions,
  getQueryFieldKey,
  evaluateQueryWhere,
  mapQueryWhere,
  type QueryWhereTree,
} from "@webstudio-is/query-builder/runtime";
import {
  assetQueryFilter,
  assetQueryMetadataFields,
  isAssetQueryRuntimeField,
  type AssetQuery,
  type AssetFileDocument,
  type ContentDatabaseDocument,
  type AssetQueryFieldPath,
  type AssetQueryOperator,
  type AssetResourceOutputSelection,
} from "./schema";
import {
  compareAssetQueryDocuments,
  matchesAssetQueryFilter,
  supportsAssetQueryContent,
} from "./structured-query";
import { contentEngineLimits } from "./limits";
import { selectAssetDocumentFields, selectAssetProperties } from "./projection";
import type { CanonicalAssetFileEntry } from "./canonical";
import {
  areJsonValuesEqual,
  compareStrings,
  type JsonValue,
} from "./canonical-json";
import {
  getJsonReferenceMarkerValue,
  isJsonObject,
} from "./document-graph/document-utils";

export const compareContentEntryPriority = (
  left: CanonicalAssetFileEntry,
  right: CanonicalAssetFileEntry
) => {
  const leftCreatedAt =
    left.document.createdAt === undefined
      ? undefined
      : Date.parse(left.document.createdAt);
  const rightCreatedAt =
    right.document.createdAt === undefined
      ? undefined
      : Date.parse(right.document.createdAt);
  if (leftCreatedAt !== undefined && rightCreatedAt === undefined) {
    return -1;
  }
  if (leftCreatedAt === undefined && rightCreatedAt !== undefined) {
    return 1;
  }
  if (
    leftCreatedAt !== undefined &&
    rightCreatedAt !== undefined &&
    leftCreatedAt !== rightCreatedAt
  ) {
    return rightCreatedAt - leftCreatedAt;
  }
  return (
    compareStrings(left.document.path, right.document.path) ||
    compareStrings(left.assetId, right.assetId)
  );
};

export type ContentCompilationValue =
  | { type: "literal"; value: unknown }
  | { type: "dynamic" };

export type ContentCompilationWhere = QueryWhereTree<{
  field: AssetQueryFieldPath;
  operator: AssetQueryOperator;
  value: ContentCompilationValue;
}>;

export type ContentCompilationQuery = {
  id: string;
  where: ContentCompilationWhere;
  sort: AssetQuery["sort"];
  limit: ContentCompilationValue;
  offset: ContentCompilationValue;
  output: AssetResourceOutputSelection;
  content: AssetQuery["content"];
};

export type ContentCompilationPlan = {
  standardFields: "all" | AssetQueryFieldPath[];
  structuredPropertyPaths: "all" | AssetQueryFieldPath[];
  excerpt: boolean;
  metadataError: boolean;
  queries: ContentCompilationQuery[];
};

export const requiresStructuredProperties = (plan: ContentCompilationPlan) =>
  plan.structuredPropertyPaths === "all" ||
  plan.structuredPropertyPaths.length > 0;

export const requiresHydratedContent = (plan: ContentCompilationPlan) =>
  plan.queries.some(({ content }) => content.mode !== "none");

const containsDocumentReference = (value: JsonValue): boolean => {
  if (typeof getJsonReferenceMarkerValue(value) === "string") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(containsDocumentReference);
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some(containsDocumentReference);
  }
  return false;
};

const isFieldAffectedByDocumentReference = (
  document: AssetFileDocument,
  field: AssetQueryFieldPath
) => {
  if (field[0] !== "properties") {
    return false;
  }
  let value: JsonValue = document.properties;
  for (const segment of field.slice(1)) {
    if (typeof getJsonReferenceMarkerValue(value) === "string") {
      return true;
    }
    if (
      typeof value !== "object" ||
      value === null ||
      Object.hasOwn(value, segment) === false
    ) {
      return false;
    }
    if (isJsonObject(value)) {
      value = value[segment];
    } else {
      const index = Number(segment);
      if (Number.isSafeInteger(index) === false) {
        return false;
      }
      value = value[index];
    }
  }
  return containsDocumentReference(value);
};

const evaluateWhere = ({
  document,
  where,
  available,
}: {
  document: AssetFileDocument;
  where: ContentCompilationWhere;
  available: "base" | "all";
}): boolean | undefined => {
  return evaluateQueryWhere(where, (condition) => {
    if (
      condition.value.type === "dynamic" ||
      isAssetQueryRuntimeField(condition.field[0]) ||
      (available === "base" &&
        (condition.field[0] === "properties" ||
          condition.field[0] === "excerpt"))
    ) {
      return;
    }
    if (isFieldAffectedByDocumentReference(document, condition.field)) {
      return;
    }
    const filter = assetQueryFilter.safeParse({
      field: condition.field,
      operator: condition.operator,
      value: condition.value.value,
    });
    return filter.success
      ? matchesAssetQueryFilter(document, filter.data)
      : undefined;
  });
};

export const getContentDocumentCandidateQueryIds = ({
  document,
  plan,
  available,
}: {
  document: AssetFileDocument;
  plan: ContentCompilationPlan;
  available: "base" | "all";
}) =>
  plan.queries
    .filter(
      (query) =>
        supportsAssetQueryContent({
          document,
          content: query.content,
        }) &&
        evaluateWhere({ document, where: query.where, available }) !== false
    )
    .map(({ id }) => id);

export const isContentDocumentCandidate = (input: {
  document: AssetFileDocument;
  plan: ContentCompilationPlan;
  available: "base" | "all";
}) => getContentDocumentCandidateQueryIds(input).length > 0;

const hasDynamicWhere = (where: ContentCompilationWhere) =>
  getQueryConditions(where).some(({ value }) => value.type === "dynamic");

export const hasDynamicContentCompilationValues = (
  plan: ContentCompilationPlan
) =>
  plan.queries.some(
    ({ where, limit, offset }) =>
      hasDynamicWhere(where) ||
      limit.type === "dynamic" ||
      offset.type === "dynamic"
  );

const matchesCompilationValue = (
  compiled: ContentCompilationValue,
  value: unknown
) => compiled.type === "dynamic" || areJsonValuesEqual(compiled.value, value);

const matchesCompilationWhere = (
  compiled: ContentCompilationWhere,
  where: AssetQuery["where"]
): boolean => {
  if ("field" in compiled || "field" in where) {
    return (
      "field" in compiled &&
      "field" in where &&
      areJsonValuesEqual(compiled.field, where.field) &&
      compiled.operator === where.operator &&
      matchesCompilationValue(compiled.value, where.value)
    );
  }
  if ("all" in compiled || "all" in where) {
    return (
      "all" in compiled &&
      "all" in where &&
      compiled.all.length === where.all.length &&
      compiled.all.every((child, index) =>
        matchesCompilationWhere(child, where.all[index])
      )
    );
  }
  return (
    compiled.any.length === where.any.length &&
    compiled.any.every((child, index) =>
      matchesCompilationWhere(child, where.any[index])
    )
  );
};

export const isAssetQueryCoveredByCompilationPlan = ({
  plan,
  query,
}: {
  plan: ContentCompilationPlan;
  query: AssetQuery;
}) =>
  plan.queries.some(
    (compiled) =>
      matchesCompilationWhere(compiled.where, query.where) &&
      areJsonValuesEqual(compiled.sort, query.sort) &&
      matchesCompilationValue(compiled.limit, query.limit) &&
      matchesCompilationValue(compiled.offset, query.offset) &&
      areJsonValuesEqual(compiled.output, query.output) &&
      areJsonValuesEqual(compiled.content, query.content)
  );

const usesRuntimeWhere = (where: ContentCompilationWhere) =>
  getQueryConditions(where).some(({ field }) =>
    isAssetQueryRuntimeField(field[0])
  );

export const selectContentHydrationCandidates = ({
  documents,
  plan,
}: {
  documents: readonly AssetFileDocument[];
  plan: ContentCompilationPlan;
}) => {
  const selected = new Set<string>();
  for (const query of plan.queries) {
    if (query.content.mode === "none") {
      continue;
    }
    const matched = documents.filter(
      (document) =>
        supportsAssetQueryContent({ document, content: query.content }) &&
        evaluateWhere({ document, where: query.where, available: "all" }) !==
          false
    );
    if (
      hasDynamicWhere(query.where) ||
      usesRuntimeWhere(query.where) ||
      query.sort.some(({ field }) => isAssetQueryRuntimeField(field[0])) ||
      query.limit.type === "dynamic" ||
      query.offset.type === "dynamic"
    ) {
      for (const document of matched) {
        selected.add(document._id);
      }
      continue;
    }
    const sorted = [...matched].sort((left, right) =>
      compareAssetQueryDocuments(left, right, query.sort)
    );
    const offset = Number(query.offset.value);
    const limit = Number(query.limit.value);
    for (const document of sorted.slice(offset, offset + limit)) {
      selected.add(document._id);
    }
  }
  return selected;
};

export const prepareContentCompilerEntries = async ({
  entries,
  plan,
  loadContent,
  maximumContentBytes = contentEngineLimits.databaseBytes,
}: {
  entries: readonly CanonicalAssetFileEntry[];
  plan?: ContentCompilationPlan;
  loadContent: (entry: CanonicalAssetFileEntry) => Promise<string | undefined>;
  maximumContentBytes?: number;
}) => {
  if (
    Number.isSafeInteger(maximumContentBytes) === false ||
    maximumContentBytes <= 0
  ) {
    throw new Error("Content hydration budget must be a positive integer");
  }
  if (plan === undefined) {
    return entries;
  }
  const projected = entries.map((entry) => {
    const { excerpt, ...document } = entry.document;
    return {
      ...entry,
      document: {
        ...document,
        properties:
          plan.structuredPropertyPaths === "all"
            ? entry.document.properties
            : selectAssetProperties({
                properties: entry.document.properties,
                fields: plan.structuredPropertyPaths,
              }),
        ...(plan.excerpt && excerpt !== undefined ? { excerpt } : {}),
      },
    };
  });
  const hydrationIds = selectContentHydrationCandidates({
    documents: projected.map(({ document }) => document),
    plan,
  });
  const candidates = projected.filter(({ document }) =>
    isContentDocumentCandidate({ document, plan, available: "all" })
  );
  let remainingContentBytes = maximumContentBytes;
  const selectedContentRefs = new Set<string>();
  const selectedHydrationIds = new Set<string>();
  for (const entry of [...candidates].sort(compareContentEntryPriority)) {
    if (hydrationIds.has(entry.assetId) === false) {
      continue;
    }
    if (selectedContentRefs.has(entry.document.contentRef)) {
      selectedHydrationIds.add(entry.assetId);
      continue;
    }
    if (entry.document.size > remainingContentBytes) {
      continue;
    }
    selectedContentRefs.add(entry.document.contentRef);
    selectedHydrationIds.add(entry.assetId);
    remainingContentBytes -= entry.document.size;
  }
  const contentByRef = new Map<string, Promise<string | undefined>>();
  return await Promise.all(
    candidates.map(async (entry) => {
      const contentRequired = hydrationIds.has(entry.assetId);
      if (contentRequired === false) {
        return entry;
      }
      if (
        selectedHydrationIds.has(entry.assetId) === false ||
        entry.document.size > contentEngineLimits.hydratedFileBytes
      ) {
        return { ...entry, contentRequired: true as const };
      }
      let pendingContent = contentByRef.get(entry.document.contentRef);
      if (pendingContent === undefined) {
        pendingContent = loadContent(entry);
        contentByRef.set(entry.document.contentRef, pendingContent);
      }
      const content = await pendingContent;
      return content === undefined
        ? { ...entry, contentRequired: true as const }
        : { ...entry, content, contentRequired: true as const };
    })
  );
};

const getOutputFields = (output: AssetResourceOutputSelection) =>
  output.mode === "fields" ? output.fields : [];

const visitQueryFields = (
  query: ContentCompilationQuery,
  visit: (field: AssetQueryFieldPath) => void
) => {
  for (const { field } of getQueryConditions(query.where)) {
    visit(field);
  }
  for (const { field } of query.sort) {
    visit(field);
  }
  for (const field of getOutputFields(query.output)) {
    visit(field);
  }
};

const addField = (
  fields: Map<string, AssetQueryFieldPath>,
  field: AssetQueryFieldPath
) => fields.set(getQueryFieldKey(field), field);

const sortFields = (fields: Iterable<AssetQueryFieldPath>) =>
  [...fields].sort((left, right) =>
    compareStrings(getQueryFieldKey(left), getQueryFieldKey(right))
  );

const includesField = (
  query: ContentCompilationQuery,
  predicate: (field: AssetQueryFieldPath) => boolean
) => {
  let included = false;
  visitQueryFields(query, (field) => {
    included ||= predicate(field);
  });
  return included;
};

export const requiresRuntimeDocumentData = (plan: ContentCompilationPlan) =>
  plan.queries.some((query) =>
    includesField(
      query,
      (field) => field.length === 1 && isAssetQueryRuntimeField(field[0])
    )
  );

const getStructuredPropertyPaths = (query: ContentCompilationQuery) => {
  if (query.output.mode === "all") {
    return "all" as const;
  }
  const fields = new Map<string, AssetQueryFieldPath>();
  visitQueryFields(query, (field) => {
    if (field[0] === "properties") {
      addField(fields, field);
    }
  });
  return sortFields(fields.values());
};

const getStandardFieldPaths = (query: ContentCompilationQuery) => {
  const fields = new Map<string, AssetQueryFieldPath>();
  visitQueryFields(query, (field) => {
    if (
      field[0] !== "properties" &&
      field[0] !== "excerpt" &&
      isAssetQueryRuntimeField(field[0]) === false
    ) {
      addField(fields, field);
    }
  });
  if (query.output.includeMetadata) {
    for (const field of assetQueryMetadataFields) {
      addField(fields, [field]);
    }
  }
  if (query.content.mode !== "none") {
    for (const field of ["mimeType", "size", "revision"] as const) {
      addField(fields, [field]);
    }
  }
  if (query.content.mode === "markdown-body-ref") {
    addField(fields, ["extension"]);
  }
  return sortFields(fields.values());
};

const getQueryRequirements = (query: ContentCompilationQuery) => ({
  standardFields: getStandardFieldPaths(query),
  structuredPropertyPaths: getStructuredPropertyPaths(query),
  excerpt:
    query.output.mode === "all" ||
    includesField(
      query,
      (field) => field.length === 1 && field[0] === "excerpt"
    ),
  metadataError: query.output.includeMetadata,
});

const toLiteralWhere = (where: AssetQuery["where"]): ContentCompilationWhere =>
  mapQueryWhere(where, (condition) => ({
    field: condition.field,
    operator: condition.operator,
    value: { type: "literal" as const, value: condition.value },
  }));

export const createLiteralContentCompilationQuery = ({
  id,
  query,
}: {
  id: string;
  query: AssetQuery;
}): ContentCompilationQuery => ({
  id,
  where: toLiteralWhere(query.where),
  sort: query.sort,
  limit: { type: "literal", value: query.limit },
  offset: { type: "literal", value: query.offset },
  output: query.output,
  content: query.content,
});

export const createContentCompilationPlan = (
  queries: readonly ContentCompilationQuery[]
): ContentCompilationPlan | undefined => {
  if (queries.length === 0) {
    return;
  }
  const requirements = queries.map(getQueryRequirements);
  const standardFields = new Map<string, AssetQueryFieldPath>();
  const structuredPropertyPaths = new Map<string, AssetQueryFieldPath>();
  for (const requirement of requirements) {
    for (const field of requirement.standardFields) {
      addField(standardFields, field);
    }
  }
  for (const requirement of requirements) {
    if (requirement.structuredPropertyPaths === "all") {
      structuredPropertyPaths.clear();
      break;
    }
    for (const field of requirement.structuredPropertyPaths) {
      addField(structuredPropertyPaths, field);
    }
  }
  return {
    standardFields: sortFields(standardFields.values()),
    structuredPropertyPaths: requirements.some(
      ({ structuredPropertyPaths }) => structuredPropertyPaths === "all"
    )
      ? "all"
      : sortFields(structuredPropertyPaths.values()),
    excerpt: requirements.some(({ excerpt }) => excerpt),
    metadataError: requirements.some(({ metadataError }) => metadataError),
    queries: [...queries],
  };
};

const hasField = (fields: "all" | AssetQueryFieldPath[], field: string) =>
  fields === "all" ||
  fields.some((path) => path.length === 1 && path[0] === field);

export const isContentCompilationFieldRequired = ({
  plan,
  field,
}: {
  plan?: ContentCompilationPlan;
  field: AssetQueryFieldPath;
}) => {
  if (plan === undefined) {
    return true;
  }
  if (field[0] === "properties") {
    return (
      plan.structuredPropertyPaths === "all" ||
      plan.structuredPropertyPaths.some(
        (required) => getQueryFieldKey(required) === getQueryFieldKey(field)
      )
    );
  }
  if (field[0] === "excerpt") {
    return plan.excerpt;
  }
  return hasField(plan.standardFields, field[0]);
};

export const projectContentDatabaseDocument = ({
  document,
  plan,
}: {
  document: AssetFileDocument;
  plan?: ContentCompilationPlan;
}): ContentDatabaseDocument => {
  if (plan === undefined) {
    return document;
  }
  const includeContentIdentity = requiresHydratedContent(plan);
  const properties =
    plan.structuredPropertyPaths === "all"
      ? document.properties
      : selectAssetProperties({
          properties: document.properties,
          fields: plan.structuredPropertyPaths,
        });
  return {
    _id: document._id,
    ...selectAssetDocumentFields({
      document,
      includes: (field) => hasField(plan.standardFields, field),
    }),
    ...(includeContentIdentity ? { contentRef: document.contentRef } : {}),
    ...(plan.structuredPropertyPaths === "all" ||
    Object.keys(properties).length > 0
      ? { properties }
      : {}),
    ...(plan.excerpt && document.excerpt !== undefined
      ? { excerpt: document.excerpt }
      : {}),
    ...(plan.metadataError && document.metadataError !== undefined
      ? { metadataError: document.metadataError }
      : {}),
  };
};

/**
 * Creates the minimal plan needed to discover every structured property.
 * Field discovery must inspect all candidate documents, but it does not need
 * excerpts or file bodies.
 */
export const createContentFieldCatalogCompilationPlan = (
  id = "field-catalog"
): ContentCompilationPlan => ({
  standardFields: "all",
  structuredPropertyPaths: "all",
  excerpt: false,
  metadataError: false,
  queries: [
    {
      id,
      where: { all: [] },
      sort: [],
      limit: { type: "literal", value: 0 },
      offset: { type: "literal", value: 0 },
      output: {
        mode: "fields",
        includeMetadata: false,
        fields: [["properties"]],
      },
      content: { mode: "none" },
    },
  ],
});
