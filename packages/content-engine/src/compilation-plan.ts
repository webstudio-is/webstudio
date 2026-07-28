import {
  getQueryConditions,
  getQueryFieldKey,
  mapQueryWhere,
  type QueryWhereTree,
} from "@webstudio-is/query-builder";
import {
  assetQueryFilter,
  type AssetQuery,
  type AssetFileDocument,
  type AssetQueryFieldPath,
  type AssetQueryOperator,
  type AssetResourceOutputSelection,
} from "./schema";
import {
  compareAssetQueryDocuments,
  matchesAssetQueryFilter,
} from "./structured-query";
import { contentEngineLimits } from "./limits";
import { selectAssetProperties } from "./projection";
import type { CanonicalAssetFileEntry } from "./canonical";

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
  structuredPropertyPaths: "all" | AssetQueryFieldPath[];
  excerpt: boolean;
  queries: ContentCompilationQuery[];
};

export const requiresStructuredProperties = (plan: ContentCompilationPlan) =>
  plan.structuredPropertyPaths === "all" ||
  plan.structuredPropertyPaths.length > 0;

export const requiresHydratedContent = (plan: ContentCompilationPlan) =>
  plan.queries.some(({ content }) => content.mode !== "none");

const evaluateWhere = ({
  document,
  where,
  available,
}: {
  document: AssetFileDocument;
  where: ContentCompilationWhere;
  available: "base" | "all";
}): boolean | undefined => {
  if ("field" in where) {
    if (
      where.value.type === "dynamic" ||
      (available === "base" &&
        (where.field[0] === "properties" || where.field[0] === "excerpt"))
    ) {
      return;
    }
    const filter = assetQueryFilter.safeParse({
      field: where.field,
      operator: where.operator,
      value: where.value.value,
    });
    return filter.success
      ? matchesAssetQueryFilter(document, filter.data)
      : undefined;
  }
  const children = "all" in where ? where.all : where.any;
  const results = children.map((child) =>
    evaluateWhere({ document, where: child, available })
  );
  if ("all" in where) {
    return results.includes(false)
      ? false
      : results.every((result) => result === true)
        ? true
        : undefined;
  }
  return results.includes(true)
    ? true
    : results.every((result) => result === false)
      ? false
      : undefined;
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
      ({ where }) => evaluateWhere({ document, where, available }) !== false
    )
    .map(({ id }) => id);

export const isContentDocumentCandidate = (input: {
  document: AssetFileDocument;
  plan: ContentCompilationPlan;
  available: "base" | "all";
}) => getContentDocumentCandidateQueryIds(input).length > 0;

const hasDynamicWhere = (where: ContentCompilationWhere) =>
  getQueryConditions(where).some(({ value }) => value.type === "dynamic");

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
        evaluateWhere({ document, where: query.where, available: "all" }) !==
        false
    );
    if (
      hasDynamicWhere(query.where) ||
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
}: {
  entries: readonly CanonicalAssetFileEntry[];
  plan?: ContentCompilationPlan;
  loadContent: (entry: CanonicalAssetFileEntry) => Promise<string | undefined>;
}) => {
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
  return await Promise.all(
    candidates.map(async (entry) => {
      if (
        hydrationIds.has(entry.assetId) === false ||
        entry.document.size > contentEngineLimits.hydratedFileBytes
      ) {
        return entry;
      }
      const content = await loadContent(entry);
      return content === undefined ? entry : { ...entry, content };
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
    getQueryFieldKey(left).localeCompare(getQueryFieldKey(right))
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

const getQueryRequirements = (query: ContentCompilationQuery) => ({
  structuredPropertyPaths: getStructuredPropertyPaths(query),
  excerpt:
    query.output.mode === "all" ||
    includesField(
      query,
      (field) => field.length === 1 && field[0] === "excerpt"
    ),
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
  const structuredPropertyPaths = new Map<string, AssetQueryFieldPath>();
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
    structuredPropertyPaths: requirements.some(
      ({ structuredPropertyPaths }) => structuredPropertyPaths === "all"
    )
      ? "all"
      : sortFields(structuredPropertyPaths.values()),
    excerpt: requirements.some(({ excerpt }) => excerpt),
    queries: [...queries],
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
  structuredPropertyPaths: "all",
  excerpt: false,
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
