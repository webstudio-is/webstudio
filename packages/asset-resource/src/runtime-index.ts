import type {
  AssetFileDocument,
  AssetResourceIndexV1,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  normalizeJsonValue,
  serializeJsonDeterministically,
  sha256,
} from "@webstudio-is/project-store";
import {
  validateAssetDetailQueryPlan,
  validateAssetListQueryPlan,
  type AssetQueryPlanV1,
} from "./query-plan";

const encoder = new TextEncoder();
const sha256Revision = /^sha256:[a-f0-9]{64}$/;
const extension = /^[a-z0-9]*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

const assertKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = []
) => {
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((name) => Object.hasOwn(value, name) === false) ||
    Object.keys(value).some((name) => allowed.has(name) === false)
  ) {
    throw new Error("Published asset resource index has invalid fields");
  }
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isRelativeAssetPath = (value: unknown): value is string =>
  isNonEmptyString(value) &&
  value.startsWith("/") === false &&
  value.includes("\\") === false &&
  value
    .split("/")
    .every(
      (segment) => segment.length > 0 && segment !== "." && segment !== ".."
    );

const assertAssetDocument = (value: unknown): AssetFileDocument => {
  if (isRecord(value) === false) {
    throw new Error("Published asset document is invalid");
  }
  assertKeys(
    value,
    [
      "_id",
      "_type",
      "name",
      "path",
      "key",
      "extension",
      "mimeType",
      "size",
      "revision",
      "contentRef",
      "properties",
    ],
    ["folderId", "excerpt", "metadataError"]
  );
  if (
    isNonEmptyString(value._id) === false ||
    value._type !== "asset.file" ||
    isNonEmptyString(value.name) === false ||
    isRelativeAssetPath(value.path) === false ||
    typeof value.key !== "string" ||
    typeof value.extension !== "string" ||
    extension.test(value.extension) === false ||
    isNonEmptyString(value.mimeType) === false ||
    typeof value.size !== "number" ||
    Number.isSafeInteger(value.size) === false ||
    value.size < 0 ||
    isNonEmptyString(value.revision) === false ||
    isNonEmptyString(value.contentRef) === false ||
    (value.folderId !== undefined &&
      isNonEmptyString(value.folderId) === false) ||
    (value.excerpt !== undefined && typeof value.excerpt !== "string") ||
    isRecord(value.properties) === false
  ) {
    throw new Error("Published asset document is invalid");
  }
  normalizeJsonValue(value.properties);
  if (value.metadataError !== undefined) {
    if (isRecord(value.metadataError) === false) {
      throw new Error("Published asset document metadata error is invalid");
    }
    assertKeys(value.metadataError, ["code", "message"]);
    if (
      isNonEmptyString(value.metadataError.code) === false ||
      isNonEmptyString(value.metadataError.message) === false
    ) {
      throw new Error("Published asset document metadata error is invalid");
    }
  }
  return value as AssetFileDocument;
};

export const checksumAssetResourceIndex = async (
  index: AssetResourceIndexV1
) => {
  const { integrity: _integrity, ...payload } = index;
  return await sha256(serializeJsonDeterministically(payload));
};

export const verifyPublishedAssetResourceIndex = async (
  value: unknown
): Promise<AssetResourceIndexV1> => {
  if (isRecord(value) === false) {
    throw new Error("Published asset resource index is invalid");
  }
  assertKeys(value, [
    "format",
    "version",
    "resourceId",
    "queryHash",
    "assetRevision",
    "plan",
    "documents",
    "integrity",
  ]);
  if (
    value.format !== "webstudio-resource-index" ||
    value.version !== 1 ||
    isNonEmptyString(value.resourceId) === false ||
    typeof value.queryHash !== "string" ||
    sha256Revision.test(value.queryHash) === false ||
    typeof value.assetRevision !== "string" ||
    sha256Revision.test(value.assetRevision) === false ||
    Array.isArray(value.documents) === false ||
    value.documents.length > assetResourceLimits.candidateDocuments ||
    isRecord(value.plan) === false ||
    isRecord(value.integrity) === false
  ) {
    throw new Error("Published asset resource index is invalid");
  }
  assertKeys(value.integrity, ["algorithm", "checksum"]);
  if (
    value.integrity.algorithm !== "sha256" ||
    typeof value.integrity.checksum !== "string" ||
    sha256Revision.test(value.integrity.checksum) === false
  ) {
    throw new Error("Published asset resource index integrity is invalid");
  }
  normalizeJsonValue(value.plan);
  const plan = value.plan as unknown as AssetQueryPlanV1;
  if (plan.kind === "asset-detail") {
    validateAssetDetailQueryPlan(plan);
  } else if (plan.kind === "asset-list") {
    validateAssetListQueryPlan(plan);
  } else {
    throw new Error("Published asset resource query plan is invalid");
  }
  if (
    plan.queryHash !== value.queryHash ||
    plan.assetRevision !== value.assetRevision
  ) {
    throw new Error("Published asset resource query plan identity is invalid");
  }
  let previousId: string | undefined;
  for (const item of value.documents) {
    const document = assertAssetDocument(item);
    if (previousId !== undefined && document._id <= previousId) {
      throw new Error("Published asset documents are not uniquely sorted");
    }
    previousId = document._id;
  }
  const index = value as unknown as AssetResourceIndexV1;
  const serialized = serializeJsonDeterministically(index);
  if (encoder.encode(serialized).byteLength > assetResourceLimits.indexBytes) {
    throw new Error("Published asset resource index exceeds the byte limit");
  }
  if (index.integrity.checksum !== (await checksumAssetResourceIndex(index))) {
    throw new Error("Published asset resource index checksum is invalid");
  }
  return index;
};
