import { describe, expect, test } from "vitest";
import {
  DocumentGraphResolutionError,
  DocumentResolutionLimitError,
} from "./document-graph";
import { getAssetResourceQueryError } from "./query-error";
import { AssetQueryMultipleResultsError } from "./structured-query";

describe("asset resource graph query errors", () => {
  test("maps ambiguous exactly-one queries to a structured error", () => {
    expect(
      getAssetResourceQueryError(new AssetQueryMultipleResultsError(2))
    ).toEqual({
      code: "MULTIPLE_RESULTS",
      message: "Expected at most one asset, but the query matched 2.",
      retryable: false,
      details: { matchedCount: 2 },
      status: 409,
    });
  });

  test("maps nested document graph limits to structured content errors", () => {
    const error = new DocumentGraphResolutionError({
      code: "DOCUMENT_LOAD_FAILED",
      message: "Document post could not be loaded",
      documentId: "post",
      cause: new DocumentResolutionLimitError({
        code: "TOTAL_BYTES_EXCEEDED",
        message: "Document graph resolution exceeds the total byte limit",
        documentId: "post",
        totalBytes: 100,
        totalByteLimit: 50,
      }),
    });

    expect(getAssetResourceQueryError(error)).toEqual({
      code: "CONTENT_LIMIT_EXCEEDED",
      message: "Document graph resolution exceeds the total byte limit",
      retryable: false,
      status: 400,
      details: {
        assetId: "post",
        totalBytes: 100,
        totalByteLimit: 50,
      },
    });
  });
});
