import type {
  AssetFileDocument,
  BuilderAssetFieldCatalog,
} from "@webstudio-is/sdk";
import {
  compareStrings,
  serializeJsonDeterministically,
} from "@webstudio-is/project-store/json";
import { encodeAssetGraphqlFieldName } from "./graphql-fields";
import { parseAssetFieldPath } from "./canonical";

export type AssetScalarKind = "string" | "number" | "boolean";
export type AssetInferredObjectField = {
  sourceName: string;
  node: AssetInferredNode;
};
export type AssetInferredNode =
  | { kind: "scalar"; scalar: AssetScalarKind }
  | {
      kind: "object";
      fields: ReadonlyMap<string, AssetInferredObjectField>;
    }
  | { kind: "list"; item: AssetInferredNode }
  | { kind: "json" };

const getScalarKind = (value: unknown): AssetScalarKind | undefined => {
  if (typeof value === "string") {
    return "string";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return "number";
  }
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

export const inferAssetNode = (
  values: readonly unknown[]
): AssetInferredNode => {
  const present = values.filter(
    (value) => value !== undefined && value !== null
  );
  if (present.length === 0) {
    return { kind: "json" };
  }
  const scalarKinds = new Set(present.map(getScalarKind));
  if (scalarKinds.size === 1 && scalarKinds.has(undefined) === false) {
    return {
      kind: "scalar",
      scalar: [...scalarKinds][0] as AssetScalarKind,
    };
  }
  if (present.every(Array.isArray)) {
    const items = present.flatMap((value) => value as unknown[]);
    return {
      kind: "list",
      item: items.length === 0 ? { kind: "json" } : inferAssetNode(items),
    };
  }
  if (present.every(isRecord)) {
    const records = present;
    const keys = [
      ...new Set(records.flatMap((record) => Object.keys(record))),
    ].sort(compareStrings);
    return {
      kind: "object",
      fields: new Map(
        keys.map((sourceName) => [
          encodeAssetGraphqlFieldName(sourceName),
          {
            sourceName,
            node: inferAssetNode(records.map((record) => record[sourceName])),
          },
        ])
      ),
    };
  }
  return { kind: "json" };
};

export const inferAssetPropertiesNode = (
  documents: readonly AssetFileDocument[]
): Extract<AssetInferredNode, { kind: "object" }> => {
  const node =
    documents.length === 0
      ? ({ kind: "object", fields: new Map() } as const)
      : inferAssetNode(documents.map((document) => document.properties));
  if (node.kind !== "object") {
    throw new Error("Asset properties must be JSON objects");
  }
  return node;
};

type CatalogNode = {
  types: Set<string>;
  fields: Map<string, CatalogNode>;
  item?: CatalogNode;
};

const createCatalogNode = (): CatalogNode => ({
  types: new Set(),
  fields: new Map(),
});

const catalogNodeToInferredNode = (node: CatalogNode): AssetInferredNode => {
  const types = [...node.types].filter((type) => type !== "null");
  if (types.length > 1) {
    return { kind: "json" };
  }
  const type = types[0];
  if (type === "string" || type === "number" || type === "boolean") {
    return { kind: "scalar", scalar: type };
  }
  if (type === "array") {
    return {
      kind: "list",
      item:
        node.item === undefined
          ? { kind: "json" }
          : catalogNodeToInferredNode(node.item),
    };
  }
  if (type === "object" || (type === undefined && node.fields.size > 0)) {
    return {
      kind: "object",
      fields: new Map(
        [...node.fields]
          .sort(([left], [right]) => compareStrings(left, right))
          .map(([sourceName, field]) => [
            encodeAssetGraphqlFieldName(sourceName),
            { sourceName, node: catalogNodeToInferredNode(field) },
          ])
      ),
    };
  }
  return { kind: "json" };
};

/** Reconstructs the dynamic GraphQL properties shape from the persisted catalog. */
export const inferAssetPropertiesNodeFromCatalog = (
  catalog: BuilderAssetFieldCatalog
): Extract<AssetInferredNode, { kind: "object" }> => {
  const root = createCatalogNode();
  root.types.add("object");
  for (const [path, field] of Object.entries(catalog.fields)) {
    const segments = parseAssetFieldPath(path);
    if (segments === undefined) {
      continue;
    }
    let node = root;
    for (const segment of segments) {
      if (segment.type === "element") {
        node.item ??= createCatalogNode();
        node = node.item;
      } else {
        const child = node.fields.get(segment.name) ?? createCatalogNode();
        node.fields.set(segment.name, child);
        node = child;
      }
    }
    for (const type of field.types) {
      node.types.add(type);
    }
  }
  const inferred = catalogNodeToInferredNode(root);
  if (inferred.kind !== "object") {
    throw new Error("Asset catalog properties must form an object");
  }
  return inferred;
};

export const assetStandardNodes = {
  id: { kind: "scalar", scalar: "string" },
  name: { kind: "scalar", scalar: "string" },
  path: { kind: "scalar", scalar: "string" },
  key: { kind: "scalar", scalar: "string" },
  folderId: { kind: "scalar", scalar: "string" },
  extension: { kind: "scalar", scalar: "string" },
  mimeType: { kind: "scalar", scalar: "string" },
  size: { kind: "scalar", scalar: "number" },
  revision: { kind: "scalar", scalar: "string" },
  excerpt: { kind: "scalar", scalar: "string" },
} as const satisfies Record<string, AssetInferredNode>;

const equalJson = (left: unknown, right: unknown) =>
  left === undefined || left === null || right === undefined || right === null
    ? (left === undefined || left === null) &&
      (right === undefined || right === null)
    : serializeJsonDeterministically(left) ===
      serializeJsonDeterministically(right);

const matchesScalar = (
  value: unknown,
  filter: Readonly<Record<string, unknown>>
) => {
  if (Object.hasOwn(filter, "eq") && equalJson(value, filter.eq) === false) {
    return false;
  }
  if (Object.hasOwn(filter, "ne") && equalJson(value, filter.ne)) {
    return false;
  }
  if (
    Array.isArray(filter.in) &&
    filter.in.some((item) => equalJson(value, item)) === false
  ) {
    return false;
  }
  if (typeof value === "string") {
    if (
      typeof filter.contains === "string" &&
      value.includes(filter.contains) === false
    ) {
      return false;
    }
    if (
      typeof filter.startsWith === "string" &&
      value.startsWith(filter.startsWith) === false
    ) {
      return false;
    }
    if (
      typeof filter.endsWith === "string" &&
      value.endsWith(filter.endsWith) === false
    ) {
      return false;
    }
  }
  if (typeof value === "number") {
    if (typeof filter.gt === "number" && value <= filter.gt) {
      return false;
    }
    if (typeof filter.gte === "number" && value < filter.gte) {
      return false;
    }
    if (typeof filter.lt === "number" && value >= filter.lt) {
      return false;
    }
    if (typeof filter.lte === "number" && value > filter.lte) {
      return false;
    }
  }
  return true;
};

const matchesNode = (
  node: AssetInferredNode,
  value: unknown,
  filter: unknown
): boolean => {
  if (typeof filter !== "object" || filter === null) {
    return true;
  }
  const record = filter as Readonly<Record<string, unknown>>;
  const exists = value !== undefined && value !== null;
  if (typeof record.exists === "boolean" && exists !== record.exists) {
    return false;
  }
  if (Object.keys(record).every((name) => name === "exists")) {
    return true;
  }
  if (node.kind === "scalar" || node.kind === "json") {
    return matchesScalar(value, record);
  }
  if (node.kind === "list") {
    if (Array.isArray(value) === false) {
      return false;
    }
    if (
      typeof record.isEmpty === "boolean" &&
      (value.length === 0) !== record.isEmpty
    ) {
      return false;
    }
    return (
      Object.hasOwn(record, "contains") === false ||
      value.some((item) => equalJson(item, record.contains))
    );
  }
  if (isRecord(value) === false) {
    return false;
  }
  return Object.entries(record).every(([name, childFilter]) => {
    if (name === "exists") {
      return true;
    }
    if (name === "_raw") {
      return matchesScalar(
        value,
        childFilter as Readonly<Record<string, unknown>>
      );
    }
    const field = node.fields.get(name);
    return field === undefined
      ? false
      : matchesNode(field.node, value[field.sourceName], childFilter);
  });
};

const getStandardValue = (document: AssetFileDocument, name: string) =>
  name === "id"
    ? document._id
    : (document as unknown as Readonly<Record<string, unknown>>)[name];

export const matchesAssetDocument = (
  document: AssetFileDocument,
  propertiesNode: AssetInferredNode,
  filter: unknown
): boolean => {
  if (typeof filter !== "object" || filter === null) {
    return true;
  }
  const record = filter as Readonly<Record<string, unknown>>;
  if (
    Array.isArray(record.AND) &&
    record.AND.every((item) =>
      matchesAssetDocument(document, propertiesNode, item)
    ) === false
  ) {
    return false;
  }
  if (
    Array.isArray(record.OR) &&
    record.OR.some((item) =>
      matchesAssetDocument(document, propertiesNode, item)
    ) === false
  ) {
    return false;
  }
  if (
    record.NOT !== undefined &&
    record.NOT !== null &&
    matchesAssetDocument(document, propertiesNode, record.NOT)
  ) {
    return false;
  }
  for (const [name, node] of Object.entries(assetStandardNodes)) {
    if (
      record[name] !== undefined &&
      matchesNode(node, getStandardValue(document, name), record[name]) ===
        false
    ) {
      return false;
    }
  }
  return (
    record.properties === undefined ||
    matchesNode(propertiesNode, document.properties, record.properties)
  );
};

export type AssetOrder = {
  field: readonly string[];
  direction: 1 | -1;
};

const getPathValue = (value: unknown, path: readonly string[]) => {
  let current = value;
  for (const [index, segment] of path.entries()) {
    if (typeof current !== "object" || current === null) {
      return;
    }
    current =
      index === 0 && segment === "id"
        ? (current as AssetFileDocument)._id
        : (current as Readonly<Record<string, unknown>>)[segment];
  }
  return current;
};

const compareValues = (left: unknown, right: unknown) => {
  if (left === undefined || left === null) {
    return right === undefined || right === null ? 0 : 1;
  }
  if (right === undefined || right === null) {
    return -1;
  }
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return compareStrings(String(left), String(right));
};

export const sortAssetDocuments = (
  documents: readonly AssetFileDocument[],
  orders: readonly AssetOrder[]
) =>
  [...documents].sort((left, right) => {
    for (const order of orders) {
      const compared =
        compareValues(
          getPathValue(left, order.field),
          getPathValue(right, order.field)
        ) * order.direction;
      if (compared !== 0) {
        return compared;
      }
    }
    return compareStrings(left._id, right._id);
  });
