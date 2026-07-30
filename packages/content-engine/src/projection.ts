import {
  assetQueryDocumentFields,
  type AssetFileDocument,
  type AssetQueryFieldPath,
  type ContentDatabaseDocument,
} from "./schema";

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

const selectPropertyPath = ({
  source,
  target,
  path,
}: {
  source: Readonly<AssetFileDocument["properties"]>;
  target: AssetFileDocument["properties"];
  path: readonly string[];
}) => {
  const [key, ...rest] = path;
  if (key === undefined || Object.hasOwn(source, key) === false) {
    return;
  }
  const value = source[key];
  if (rest.length === 0) {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    return;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return;
  }
  const selected: AssetFileDocument["properties"] = {};
  selectPropertyPath({
    source: value as Readonly<AssetFileDocument["properties"]>,
    target: selected,
    path: rest,
  });
  if (Object.keys(selected).length === 0) {
    return;
  }
  const existing = target[key];
  Object.defineProperty(target, key, {
    value: {
      ...(typeof existing === "object" &&
      existing !== null &&
      Array.isArray(existing) === false
        ? existing
        : {}),
      ...selected,
    },
    enumerable: true,
    configurable: true,
    writable: true,
  });
};

export const selectAssetProperties = ({
  properties,
  fields,
}: {
  properties: AssetFileDocument["properties"];
  fields: readonly AssetQueryFieldPath[];
}) => {
  const selected: AssetFileDocument["properties"] = {};
  for (const field of fields) {
    if (field[0] !== "properties") {
      continue;
    }
    selectPropertyPath({
      source: properties,
      target: selected,
      path: field.slice(1),
    });
  }
  return selected;
};
