// Fingerprints the small request contracts that outcome validation must
// correlate without retaining arbitrary agent payloads in the MCP trace.
import { createHash } from "node:crypto";
import { assetQuery } from "@webstudio-is/content-engine";
import { serializeJsonDeterministically } from "@webstudio-is/content-engine/compiler";
import { mapQueryWhere } from "@webstudio-is/query-builder/runtime";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

const fingerprint = (domain: string, value: unknown) =>
  createHash("sha256")
    .update(domain)
    .update("\0")
    .update(serializeJsonDeterministically(value))
    .digest("hex");

const getValueShape = (value: unknown) => {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
};

export const getAssetQueryContractFingerprints = (value: unknown) => {
  const parsed = assetQuery.safeParse(value);
  if (parsed.success === false) {
    return;
  }
  const shape = {
    ...parsed.data,
    where: mapQueryWhere(parsed.data.where, (condition) => ({
      ...condition,
      value: getValueShape(condition.value),
    })),
  };
  return {
    sha256: fingerprint("asset-query", parsed.data),
    shapeSha256: fingerprint("asset-query-shape", shape),
  };
};

const hasExactKeys = (value: Record<string, unknown>, keys: string[]) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
};

export const getPageSettingsContractFingerprint = (value: unknown) => {
  if (
    isRecord(value) === false ||
    hasExactKeys(value, ["pageId", "values"]) === false ||
    typeof value.pageId !== "string" ||
    isRecord(value.values) === false ||
    hasExactKeys(value.values, ["title", "meta"]) === false ||
    typeof value.values.title !== "string" ||
    isRecord(value.values.meta) === false ||
    hasExactKeys(value.values.meta, [
      "description",
      "socialImageUrl",
      "status",
    ]) === false ||
    typeof value.values.meta.description !== "string" ||
    typeof value.values.meta.socialImageUrl !== "string" ||
    typeof value.values.meta.status !== "string"
  ) {
    return;
  }
  return fingerprint("page-settings", {
    pageId: value.pageId,
    values: {
      title: value.values.title,
      meta: {
        description: value.values.meta.description,
        socialImageUrl: value.values.meta.socialImageUrl,
        status: value.values.meta.status,
      },
    },
  });
};
