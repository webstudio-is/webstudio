import type {
  AssetQuery,
  AssetQueryFieldPath,
  AssetResourceOutputSelection,
} from "./schema/asset-resource";
import type { StructuredAssetQueryResourceConfiguration } from "./asset-resource-config";

type RequirementsQuery =
  | Pick<
      StructuredAssetQueryResourceConfiguration,
      "where" | "sort" | "output" | "content"
    >
  | Pick<AssetQuery, "where" | "sort" | "output" | "content">;

export type AssetQueryRequirements = {
  baseMetadata: true;
  structuredProperties: boolean;
  structuredPropertyPaths: "all" | AssetQueryFieldPath[];
  excerpt: boolean;
  hydratedContent: boolean;
  output: AssetResourceOutputSelection;
};

const visitWhere = (
  where: RequirementsQuery["where"],
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
  query: RequirementsQuery,
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

const getStructuredPropertyPaths = (query: RequirementsQuery) => {
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

export const getAssetQueryRequirements = (
  query: RequirementsQuery
): AssetQueryRequirements => ({
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

export const mergeAssetQueryRequirements = (
  queries: readonly RequirementsQuery[]
): AssetQueryRequirements | undefined => {
  if (queries.length === 0) {
    return;
  }
  const requirements = queries.map(getAssetQueryRequirements);
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
  };
};
