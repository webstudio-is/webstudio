import type {
  AssetQuery,
  AssetFileDocument,
  AssetQueryFieldPath,
  AssetQueryOperator,
  AssetResourceOutputSelection,
} from "./schema";
import { assetQueryFilter } from "./schema";
import { matchesAssetQueryFilter } from "./structured-query";
import { compareAssetQueryDocuments } from "./structured-query";
import { contentEngineLimits } from "./limits";
import { selectAssetProperties } from "./projection";
import type { CanonicalAssetFileEntry } from "./canonical";

export type ContentCompilationValue =
  | { type: "literal"; value: unknown }
  | { type: "dynamic" };

export type ContentCompilationWhere =
  | {
      field: AssetQueryFieldPath;
      operator: AssetQueryOperator;
      value: ContentCompilationValue;
    }
  | { all: ContentCompilationWhere[] }
  | { any: ContentCompilationWhere[] };

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
  baseMetadata: true;
  structuredProperties: boolean;
  structuredPropertyPaths: "all" | AssetQueryFieldPath[];
  excerpt: boolean;
  hydratedContent: boolean;
  output: AssetResourceOutputSelection;
  queries: ContentCompilationQuery[];
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

const hasDynamicWhere = (where: ContentCompilationWhere): boolean => {
  if ("field" in where) {
    return where.value.type === "dynamic";
  }
  return ("all" in where ? where.all : where.any).some(hasDynamicWhere);
};

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

const visitWhere = (
  where: ContentCompilationWhere,
  visit: (field: AssetQueryFieldPath) => void
) => {
  if ("field" in where) {
    visit(where.field);
    return;
  }
  for (const child of "all" in where ? where.all : where.any) {
    visitWhere(child, visit);
  }
};

const getOutputFields = (output: AssetResourceOutputSelection) =>
  output.mode === "fields" ? output.fields : [];

const includesField = (
  query: ContentCompilationQuery,
  predicate: (field: AssetQueryFieldPath) => boolean
) => {
  let included = false;
  visitWhere(query.where, (field) => {
    included ||= predicate(field);
  });
  return (
    included ||
    query.sort.some(({ field }) => predicate(field)) ||
    getOutputFields(query.output).some(predicate)
  );
};

const getStructuredPropertyPaths = (query: ContentCompilationQuery) => {
  if (query.output.mode === "all") {
    return "all" as const;
  }
  const fields = new Map<string, AssetQueryFieldPath>();
  const add = (field: AssetQueryFieldPath) => {
    if (field[0] === "properties") {
      fields.set(JSON.stringify(field), field);
    }
  };
  visitWhere(query.where, add);
  for (const { field } of query.sort) {
    add(field);
  }
  for (const field of getOutputFields(query.output)) {
    add(field);
  }
  return [...fields.values()].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right))
  );
};

const getQueryRequirements = (query: ContentCompilationQuery) => ({
  baseMetadata: true,
  structuredProperties:
    query.output.mode === "all" ||
    includesField(query, (field) => field[0] === "properties"),
  structuredPropertyPaths: getStructuredPropertyPaths(query),
  excerpt:
    query.output.mode === "all" ||
    includesField(
      query,
      (field) => field.length === 1 && field[0] === "excerpt"
    ),
  hydratedContent: query.content.mode !== "none",
  output: query.output,
});

const toLiteralWhere = (
  where: AssetQuery["where"]
): ContentCompilationWhere => {
  if ("field" in where) {
    return {
      field: where.field,
      operator: where.operator,
      value: { type: "literal", value: where.value },
    };
  }
  if ("all" in where) {
    return { all: where.all.map(toLiteralWhere) };
  }
  return { any: where.any.map(toLiteralWhere) };
};

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

const mergeOutput = (
  outputs: readonly AssetResourceOutputSelection[]
): AssetResourceOutputSelection => {
  if (outputs.some(({ mode }) => mode === "all")) {
    return { mode: "all" };
  }
  const fields = new Map<string, AssetQueryFieldPath>();
  for (const output of outputs) {
    for (const field of getOutputFields(output)) {
      fields.set(JSON.stringify(field), field);
    }
  }
  if (fields.size === 0) {
    return { mode: "base" };
  }
  return {
    mode: "fields",
    fields: [...fields.values()].sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right))
    ),
  };
};

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
      structuredPropertyPaths.set(JSON.stringify(field), field);
    }
  }
  return {
    baseMetadata: true,
    structuredProperties: requirements.some(
      ({ structuredProperties }) => structuredProperties
    ),
    structuredPropertyPaths: requirements.some(
      ({ structuredPropertyPaths }) => structuredPropertyPaths === "all"
    )
      ? "all"
      : [...structuredPropertyPaths.values()].sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right))
        ),
    excerpt: requirements.some(({ excerpt }) => excerpt),
    hydratedContent: requirements.some(
      ({ hydratedContent }) => hydratedContent
    ),
    output: mergeOutput(requirements.map(({ output }) => output)),
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
  baseMetadata: true,
  structuredProperties: true,
  structuredPropertyPaths: "all",
  excerpt: false,
  hydratedContent: false,
  output: { mode: "fields", fields: [["properties"]] },
  queries: [
    {
      id,
      where: { all: [] },
      sort: [],
      limit: { type: "literal", value: 0 },
      offset: { type: "literal", value: 0 },
      output: { mode: "fields", fields: [["properties"]] },
      content: { mode: "none" },
    },
  ],
});
