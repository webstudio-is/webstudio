import { assetFileDocument, type AssetFileDocument } from "@webstudio-is/sdk";
import { compareStrings } from "./stable-json";

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

const getObservedType = (value: unknown): ObservedFieldType => {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  const type = typeof value;
  if (
    type === "boolean" ||
    type === "number" ||
    type === "string" ||
    type === "object"
  ) {
    return type;
  }
  throw new Error("Field contribution contains a non-JSON value");
};

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const appendAssetFieldPath = (path: string, key: string) =>
  identifier.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;

export const getFieldContributions = (
  properties: AssetFileDocument["properties"]
): FieldContribution[] => {
  const contributions = new Map<string, FieldContribution>();
  const add = (path: string, value: unknown) => {
    const type = getObservedType(value);
    contributions.set(`${path}\u0000${type}`, { path, type });
    if (Array.isArray(value)) {
      for (const item of value) {
        add(`${path}[]`, item);
      }
      return;
    }
    if (value !== null && typeof value === "object") {
      for (const key of Object.keys(value).sort()) {
        add(
          appendAssetFieldPath(path, key),
          (value as Record<string, unknown>)[key]
        );
      }
    }
  };

  for (const key of Object.keys(properties).sort()) {
    add(appendAssetFieldPath("properties", key), properties[key]);
  }
  return Array.from(contributions.values()).sort(
    (left, right) =>
      compareStrings(left.path, right.path) ||
      compareStrings(left.type, right.type)
  );
};

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
