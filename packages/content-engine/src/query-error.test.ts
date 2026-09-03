import { describe, expect, test } from "vitest";
import {
  DocumentSourceCompilationError,
  DocumentGraphResolutionError,
  DocumentResolutionLimitError,
} from "./document-graph";
import { MdxDocumentError } from "./mdx";
import { MarkdownMetadataError } from "./markdown";
import { MarkdownDocumentError } from "./document-graph/markdown-document";
import { getAssetResourceQueryError } from "./query-error";
import { getDetailedAssetResourceQueryError } from "./query-error-details";
import { AssetQueryRequestError } from "./request";
import { AssetQueryMultipleResultsError } from "./structured-query";
import { DocumentSourceDiagnosticsError } from "./content-source";

describe("asset resource graph query errors", () => {
  test("preserves every document source diagnostic", () => {
    const diagnostics = [
      {
        severity: "error" as const,
        code: "invalid-mdx",
        message: "Broken first file",
        assetId: "one",
        path: "posts/one.mdx",
        line: 2,
        column: 1,
      },
      {
        severity: "error" as const,
        code: "invalid-mdx",
        message: "Broken second file",
        assetId: "two",
        path: "posts/two.mdx",
        line: 4,
        column: 3,
      },
    ];

    expect(
      getDetailedAssetResourceQueryError(
        new DocumentSourceDiagnosticsError(diagnostics)
      )
    ).toEqual({
      code: "INVALID_REQUEST",
      message: "2 document source errors found",
      retryable: false,
      status: 400,
      details: {
        diagnostics: diagnostics.map((diagnostic) => ({
          ...diagnostic,
          scope: "query",
          phase: "source",
        })),
      },
    });
  });

  test("preserves the published database scope for source diagnostics", () => {
    const diagnostics = [
      {
        severity: "warning" as const,
        scope: "query" as const,
        phase: "metadata" as const,
        code: "FRONTMATTER_INVALID",
        message: "Current query warning",
        assetId: "current",
        path: "posts/current.md",
      },
      {
        severity: "error" as const,
        code: "invalid-mdx",
        message: "Broken published file",
        assetId: "published",
        path: "posts/published.mdx",
      },
    ];

    expect(
      getDetailedAssetResourceQueryError(
        new DocumentSourceDiagnosticsError(diagnostics, "database")
      )
    ).toMatchObject({
      details: {
        diagnostics: [
          {
            scope: "query",
            phase: "metadata",
            path: "posts/current.md",
          },
          {
            scope: "database",
            phase: "source",
            path: "posts/published.mdx",
          },
        ],
      },
    });
  });

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

  test("includes query parser details only for authenticated diagnostics", () => {
    const error = new AssetQueryRequestError("Asset query request is invalid", {
      cause: new SyntaxError(
        "Expected property name or '}' in JSON at position 1"
      ),
    });

    expect(getAssetResourceQueryError(error)).toBeUndefined();
    expect(getDetailedAssetResourceQueryError(error)).toEqual({
      code: "INVALID_REQUEST",
      message: "Expected property name or '}' in JSON at position 1",
      retryable: false,
      status: 400,
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

  test("includes source details only for authenticated diagnostics", () => {
    const error = new DocumentSourceCompilationError({
      code: "DOCUMENT_ANALYSIS_FAILED",
      message: "Document could not be analyzed",
      documentId: "post",
      documentPath: "posts/broken.mdx",
      cause: new MdxDocumentError({
        code: "invalid-mdx",
        message: "Unexpected closing tag",
        reason: "Unexpected closing tag",
        sourceRange: {
          start: { line: 7, column: 4, offset: 42 },
          end: { line: 7, column: 8, offset: 46 },
        },
      }),
    });

    expect(getAssetResourceQueryError(error)).toBeUndefined();
    expect(getDetailedAssetResourceQueryError(error)).toEqual({
      code: "INVALID_REQUEST",
      message: "Unexpected closing tag",
      retryable: false,
      status: 400,
      details: {
        assetId: "post",
        path: "posts/broken.mdx",
        line: 7,
        column: 4,
        reason: "Unexpected closing tag",
      },
    });
  });

  test("preserves nested Markdown frontmatter errors and file context", () => {
    const error = new DocumentSourceCompilationError({
      code: "DOCUMENT_ANALYSIS_FAILED",
      message: "Document could not be analyzed",
      documentId: "post",
      documentPath: "posts/broken.md",
      cause: new MarkdownDocumentError({
        code: "INVALID_DOCUMENT",
        message: "Markdown document is invalid",
        cause: new MarkdownMetadataError(
          "FRONTMATTER_INVALID",
          "Map keys must be unique",
          { line: 4, column: 1 }
        ),
      }),
    });

    expect(getDetailedAssetResourceQueryError(error)).toEqual({
      code: "INVALID_REQUEST",
      message: "Map keys must be unique",
      retryable: false,
      status: 400,
      details: {
        assetId: "post",
        path: "posts/broken.md",
        line: 4,
        column: 1,
      },
    });
  });

  test("preserves document source failures that have no nested parser error", () => {
    expect(
      getDetailedAssetResourceQueryError(
        new DocumentSourceCompilationError({
          code: "ROOT_NOT_FOUND",
          message: "Document source graph root missing does not exist",
          documentId: "missing",
        })
      )
    ).toEqual({
      code: "INVALID_REQUEST",
      message: "Document source graph root missing does not exist",
      retryable: false,
      details: { assetId: "missing" },
      status: 400,
    });
  });
});
