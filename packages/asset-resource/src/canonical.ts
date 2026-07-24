import { assetFileDocument, type AssetFileDocument } from "@webstudio-is/sdk";
import {
  compareStrings,
  serializeJsonDeterministically,
} from "@webstudio-is/project-store";

export type AssetFileMetadataInput = {
  id: string;
  name: string;
  extension?: string;
  folderId?: string;
  folderNames?: readonly string[];
  mimeType: string;
  size: number;
  revision: string;
  contentRef: string;
};

export type CanonicalAssetFileEntry = {
  projectId: string;
  assetId: string;
  revision: string;
  document: AssetFileDocument;
  fieldContributions: FieldContribution[];
};

export type ObservedFieldType =
  | "null"
  | "boolean"
  | "number"
  | "string"
  | "object"
  | "array";

export type FieldContribution = {
  path: string;
  type: ObservedFieldType;
};

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const appendAssetFieldPath = (path: string, key: string) =>
  identifier.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;

type FieldPathSegment = { type: "field"; name: string } | { type: "element" };

const getObservedType = (value: unknown): ObservedFieldType => {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  const type = typeof value;
  if (type === "number") {
    if (Number.isFinite(value) === false) {
      throw new Error("Asset field contains a non-finite number");
    }
    return type;
  }
  if (type === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("Asset field contains a non-plain object");
    }
    return type;
  }
  if (type === "boolean" || type === "string") {
    return type;
  }
  throw new Error("Asset field contains a non-JSON value");
};

const compareFieldPaths = (
  left: FieldPathSegment[],
  right: FieldPathSegment[]
) => {
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    const leftSegment = left[index];
    const rightSegment = right[index];
    if (leftSegment.type !== rightSegment.type) {
      return leftSegment.type === "field" ? -1 : 1;
    }
    if (leftSegment.type === "field" && rightSegment.type === "field") {
      const result = compareStrings(leftSegment.name, rightSegment.name);
      if (result !== 0) {
        return result;
      }
    }
  }
  return left.length - right.length;
};

const getStructuralFieldContributions = (
  fields: Readonly<Record<string, unknown>>
) => {
  const contributions = new Map<
    string,
    { path: FieldPathSegment[]; type: ObservedFieldType }
  >();
  const add = (path: FieldPathSegment[], value: unknown) => {
    const contribution = { path, type: getObservedType(value) };
    contributions.set(
      `${serializeJsonDeterministically(path)}\u0000${contribution.type}`,
      contribution
    );
    if (Array.isArray(value)) {
      for (const item of value) {
        add([...path, { type: "element" }], item);
      }
      return;
    }
    if (value !== null && typeof value === "object") {
      for (const key of Object.keys(value).sort(compareStrings)) {
        add(
          [...path, { type: "field", name: key }],
          (value as Record<string, unknown>)[key]
        );
      }
    }
  };
  for (const key of Object.keys(fields).sort(compareStrings)) {
    add([{ type: "field", name: key }], fields[key]);
  }
  return [...contributions.values()].sort(
    (left, right) =>
      compareFieldPaths(left.path, right.path) ||
      compareStrings(left.type, right.type)
  );
};

const formatLegacyFieldPath = (path: FieldPathSegment[]) => {
  let formatted = "properties";
  for (const segment of path) {
    formatted =
      segment.type === "element"
        ? `${formatted}[]`
        : appendAssetFieldPath(formatted, segment.name);
  }
  return formatted;
};

export const getFieldContributions = (
  properties: AssetFileDocument["properties"]
): FieldContribution[] =>
  getStructuralFieldContributions(properties)
    .map(({ path, type }) => ({ path: formatLegacyFieldPath(path), type }))
    .sort(
      (left, right) =>
        compareStrings(left.path, right.path) ||
        compareStrings(left.type, right.type)
    );

export const createCanonicalAssetFileEntry = ({
  projectId,
  document,
}: {
  projectId: string;
  document: unknown;
}): CanonicalAssetFileEntry => {
  const parsedDocument = assetFileDocument.parse(document);
  return {
    projectId,
    assetId: parsedDocument._id,
    revision: parsedDocument.revision,
    document: parsedDocument,
    fieldContributions: getFieldContributions(parsedDocument.properties),
  };
};

// Asset and folder names are user data, not filesystem paths. Encode each name
// independently so slashes and dot segments cannot change path structure while
// preserving the original name in the document for display and exact matching.
const encodeAssetPathSegment = (segment: string) => {
  const encoded = encodeURIComponent(segment);
  if (encoded === ".") {
    return "%2E";
  }
  if (encoded === "..") {
    return "%2E%2E";
  }
  return encoded;
};

/**
 * Builds the canonical GROQ document without merging user properties into the
 * reserved standard metadata namespace.
 */
export const normalizeAssetFileDocument = ({
  asset,
  properties,
  excerpt,
  metadataError,
}: {
  asset: AssetFileMetadataInput;
  properties: Record<string, unknown>;
  excerpt?: string;
  metadataError?: AssetFileDocument["metadataError"];
}): AssetFileDocument => {
  const folderNames = asset.folderNames ?? [];
  if ((asset.folderId === undefined) !== (folderNames.length === 0)) {
    throw new Error(
      "Asset folder ID and complete folder-name path must be provided together"
    );
  }
  const extensionSeparator = asset.name.lastIndexOf(".");
  const extension =
    asset.extension ??
    (extensionSeparator === -1
      ? ""
      : asset.name.slice(extensionSeparator + 1).toLowerCase());
  const key =
    extensionSeparator <= 0
      ? asset.name
      : asset.name.slice(0, extensionSeparator);
  const path = [...folderNames, asset.name]
    .map(encodeAssetPathSegment)
    .join("/");

  return assetFileDocument.parse({
    _id: asset.id,
    _type: "asset.file",
    name: asset.name,
    path,
    key,
    ...(asset.folderId === undefined ? {} : { folderId: asset.folderId }),
    extension,
    mimeType: asset.mimeType,
    size: asset.size,
    revision: asset.revision,
    contentRef: asset.contentRef,
    properties,
    ...(excerpt === undefined ? {} : { excerpt }),
    ...(metadataError === undefined ? {} : { metadataError }),
  });
};
