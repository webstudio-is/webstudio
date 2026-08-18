import {
  assetQueryDocumentFields,
  type AssetFileDocument,
  type AssetQueryFieldPath,
  type ContentDatabaseDocument,
} from "./schema";
import { getJsonReferenceMarkerValue } from "./document-graph/document-utils";
import type { JsonValue } from "./canonical-json";

export const selectAssetDocumentFields = ({
  document,
  includes,
}: {
  document: AssetFileDocument | ContentDatabaseDocument;
  includes: (field: (typeof assetQueryDocumentFields)[number]) => boolean;
}) => {
  const selected: Record<string, unknown> = {};
  for (const field of assetQueryDocumentFields) {
    const value = document[field];
    if (value !== undefined && includes(field)) {
      selected[field] = value;
    }
  }
  return selected;
};

const missing = Symbol("missing property selection");

const selectValuePaths = (
  value: JsonValue,
  paths: readonly (readonly string[])[]
): JsonValue | typeof missing => {
  if (
    paths.some((path) => path.length === 0) ||
    typeof getJsonReferenceMarkerValue(value) === "string"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    const childPaths = paths
      .filter(([segment]) => segment === "*")
      .map((path) => path.slice(1));
    if (childPaths.length === 0) {
      return missing;
    }
    const selected = value.map((item) => selectValuePaths(item, childPaths));
    return selected.some((item) => item !== missing)
      ? selected.map((item) => (item === missing ? null : item))
      : missing;
  }
  if (typeof value !== "object" || value === null) {
    return missing;
  }
  const selected: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    const childPaths = paths
      .filter(([segment]) => segment === key)
      .map((path) => path.slice(1));
    if (childPaths.length === 0) {
      continue;
    }
    const child = selectValuePaths(item, childPaths);
    if (child !== missing) {
      selected[key] = child;
    }
  }
  return Object.keys(selected).length === 0 ? missing : selected;
};

export const selectAssetProperties = ({
  properties,
  fields,
}: {
  properties: AssetFileDocument["properties"];
  fields: readonly AssetQueryFieldPath[];
}) => {
  const paths = fields
    .filter(([root]) => root === "properties")
    .map((field) => field.slice(1));
  const selected = selectValuePaths(properties, paths);
  return selected === missing
    ? {}
    : (selected as AssetFileDocument["properties"]);
};
