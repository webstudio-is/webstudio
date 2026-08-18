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

const selectValuePath = (
  value: JsonValue,
  path: readonly string[]
): JsonValue | typeof missing => {
  if (
    path.length === 0 ||
    typeof getJsonReferenceMarkerValue(value) === "string"
  ) {
    return value;
  }
  const [segment, ...rest] = path;
  if (Array.isArray(value)) {
    if (segment !== "*") {
      return missing;
    }
    const selected = value.map((item) => selectValuePath(item, rest));
    return selected.some((item) => item !== missing)
      ? selected.map((item) => (item === missing ? null : item))
      : missing;
  }
  if (
    typeof value !== "object" ||
    value === null ||
    Object.hasOwn(value, segment) === false
  ) {
    return missing;
  }
  const selected = selectValuePath(
    (value as Readonly<Record<string, JsonValue>>)[segment],
    rest
  );
  return selected === missing ? missing : { [segment]: selected };
};

const mergeSelectedValues = (left: JsonValue, right: JsonValue): JsonValue => {
  if (Array.isArray(left) && Array.isArray(right)) {
    return Array.from(
      { length: Math.max(left.length, right.length) },
      (_, index) => {
        const leftItem = left[index];
        const rightItem = right[index];
        if (leftItem === undefined) {
          return rightItem ?? null;
        }
        if (rightItem === undefined) {
          return leftItem;
        }
        return mergeSelectedValues(leftItem, rightItem);
      }
    );
  }
  if (
    typeof left === "object" &&
    left !== null &&
    Array.isArray(left) === false &&
    typeof right === "object" &&
    right !== null &&
    Array.isArray(right) === false
  ) {
    const leftObject = left as Readonly<Record<string, JsonValue>>;
    const rightObject = right as Readonly<Record<string, JsonValue>>;
    const merged: Record<string, JsonValue> = { ...leftObject };
    for (const [key, value] of Object.entries(rightObject)) {
      merged[key] =
        Object.hasOwn(merged, key) && merged[key] !== undefined
          ? mergeSelectedValues(merged[key], value)
          : value;
    }
    return merged;
  }
  return right;
};

export const selectAssetProperties = ({
  properties,
  fields,
}: {
  properties: AssetFileDocument["properties"];
  fields: readonly AssetQueryFieldPath[];
}) => {
  let selected: JsonValue = {};
  for (const field of fields) {
    if (field[0] !== "properties") {
      continue;
    }
    const value = selectValuePath(properties, field.slice(1));
    if (value !== missing) {
      selected = mergeSelectedValues(selected, value);
    }
  }
  return selected as AssetFileDocument["properties"];
};
