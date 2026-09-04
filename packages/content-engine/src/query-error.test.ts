import { describe, expect, test } from "vitest";
import {
  DocumentSourceCompilationError,
  DocumentSourceCompilationAggregateError,
  DocumentGraphCompilationError,
  DocumentGraphResolutionError,
  DocumentReferenceSyntaxError,
  DocumentResolutionLimitError,
  JsonDocumentError,
} from "./document-graph";
import { MdxDocumentError } from "./mdx";
import { MarkdownMetadataError } from "./markdown";
import { MarkdownDocumentError } from "./document-graph/markdown-document";
import { getAssetResourceQueryError } from "./query-error";
import {
  getAssetQueryErrorDiagnosticIssue,
  getDetailedAssetResourceQueryError,
} from "./query-error-details";
import { AssetQueryRequestError } from "./request";
import {
  AssetQueryExecutionError,
  AssetQueryMultipleResultsError,
} from "./structured-query";
import { DocumentSourceDiagnosticsError } from "./content-source";
import { assetQueryRequest } from "./schema";

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

  test("preserves every semantic query setup issue", () => {
    expect(
      getAssetResourceQueryError(
        new AssetQueryExecutionError("2 invalid query operations found", {
          issues: [
            {
              severity: "error",
              code: "INCOMPATIBLE_OPERATOR",
              path: ["query", "where"],
              message: "First incompatible operator",
            },
            {
              severity: "warning",
              code: "UNOBSERVED_FIELD",
              path: ["query", "where"],
              message: "Unobserved field",
            },
          ],
        })
      )
    ).toMatchObject({
      code: "INVALID_REQUEST",
      details: {
        issues: [
          { severity: "error", message: "First incompatible operator" },
          { severity: "warning", message: "Unobserved field" },
        ],
      },
    });
  });

  test("preserves stable execution error codes and details", () => {
    expect(
      getAssetResourceQueryError(
        new AssetQueryExecutionError(
          "Asset query document limit was exceeded",
          {
            code: "CONTENT_LIMIT_EXCEEDED",
            details: { documentCount: 1001, documentLimit: 1000 },
          } as never
        )
      )
    ).toEqual({
      code: "CONTENT_LIMIT_EXCEEDED",
      message: "Asset query document limit was exceeded",
      retryable: false,
      details: { documentCount: 1001, documentLimit: 1000 },
      status: 400,
    });

    expect(
      getAssetResourceQueryError(
        new AssetQueryExecutionError("Asset URL is unavailable for post", {
          details: { assetId: "post" },
        } as never)
      )
    ).toEqual({
      code: "INVALID_REQUEST",
      message: "Asset URL is unavailable for post",
      retryable: false,
      details: { assetId: "post" },
      status: 400,
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

  test("preserves every query schema error for authenticated diagnostics", () => {
    const parsed = assetQueryRequest.safeParse({
      query: {
        result: "first",
        limit: -1,
        output: { mode: "fields", includeMetadata: false, fields: [] },
        content: { mode: "none" },
      },
    });
    if (parsed.success) {
      throw new Error("Expected an invalid Asset query request");
    }

    expect(
      getDetailedAssetResourceQueryError(
        new AssetQueryRequestError("Asset query request is invalid", {
          cause: parsed.error,
        })
      )
    ).toMatchObject({
      code: "INVALID_REQUEST",
      message: "Asset query request is invalid",
      retryable: false,
      status: 400,
      details: {
        issues: [
          { path: ["query", "limit"] },
          { path: ["query"] },
          { path: ["query", "sort"] },
        ],
      },
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

  test("maps graph compilation failures to exact file diagnostics", () => {
    const error = new DocumentGraphCompilationError({
      code: "TARGET_NOT_FOUND",
      message: "Referenced author does not exist",
      sourceDocumentId: "post",
      referenceId: "#frontmatter/author",
      documentUrl: "https://content.webstudio.local/authors/missing.md",
      documentPath: "posts/post.md",
    });

    expect(getDetailedAssetResourceQueryError(error)).toEqual({
      code: "INVALID_REQUEST",
      message: "Referenced author does not exist",
      retryable: false,
      status: 400,
      details: {
        diagnostics: [
          {
            severity: "error",
            scope: "query",
            phase: "reference",
            code: "TARGET_NOT_FOUND",
            message: "Referenced author does not exist",
            assetId: "post",
            path: "posts/post.md",
            reference: "#frontmatter/author",
          },
        ],
      },
    });
  });

  test("maps every aggregated graph failure to its exact file", () => {
    const error = new DocumentSourceCompilationAggregateError([
      new DocumentGraphCompilationError({
        code: "TARGET_NOT_FOUND",
        message: "First target does not exist",
        sourceDocumentId: "first",
        referenceId: "#/author",
        documentPath: "posts/first.json",
      }),
      new DocumentGraphCompilationError({
        code: "TARGET_NOT_FOUND",
        message: "Second target does not exist",
        sourceDocumentId: "second",
        referenceId: "#/author",
        documentPath: "posts/second.json",
      }),
    ]);

    expect(getDetailedAssetResourceQueryError(error)).toMatchObject({
      code: "INVALID_REQUEST",
      details: {
        diagnostics: [
          {
            code: "TARGET_NOT_FOUND",
            assetId: "first",
            path: "posts/first.json",
            reference: "#/author",
          },
          {
            code: "TARGET_NOT_FOUND",
            assetId: "second",
            path: "posts/second.json",
            reference: "#/author",
          },
        ],
      },
    });
  });

  test("maps nested graph runtime causes to exact file diagnostics", () => {
    const error = new DocumentGraphResolutionError({
      code: "DOCUMENT_ASSEMBLY_FAILED",
      message: "Post could not be assembled",
      documentId: "post",
      referenceId: "#/author",
      cause: new JsonDocumentError({
        code: "REFERENCE_NOT_FOUND",
        message: "Resolved JSON reference #/author is unavailable",
        referenceId: "#/author",
      }),
    });

    expect(
      getAssetQueryErrorDiagnosticIssue({
        error,
        pathsByAssetId: new Map([["post", "posts/post.json"]]),
      })
    ).toEqual({
      severity: "error",
      scope: "query",
      phase: "reference",
      code: "REFERENCE_NOT_FOUND",
      message: "Resolved JSON reference #/author is unavailable",
      assetId: "post",
      path: "posts/post.json",
      reference: "#/author",
    });
  });

  test("classifies malformed reference fragments as reference diagnostics", () => {
    const error = new DocumentSourceCompilationError({
      code: "DOCUMENT_ANALYSIS_FAILED",
      message: "Document could not be analyzed",
      documentId: "post",
      documentPath: "posts/post.json",
      cause: new DocumentReferenceSyntaxError({
        code: "INVALID_FRAGMENT",
        message: "Document reference fragment is invalid",
        value: "author",
      }),
    });

    expect(getAssetQueryErrorDiagnosticIssue({ error })).toMatchObject({
      phase: "reference",
      code: "INVALID_FRAGMENT",
      assetId: "post",
      path: "posts/post.json",
      reference: "author",
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
        nodeType: "mdxJsxFlowElement",
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
        diagnostics: [
          {
            severity: "error",
            scope: "query",
            phase: "source",
            code: "invalid-mdx",
            message: "Unexpected closing tag",
            assetId: "post",
            path: "posts/broken.mdx",
            line: 7,
            column: 4,
            nodeType: "mdxJsxFlowElement",
            reason: "Unexpected closing tag",
            sourceRange: {
              start: { line: 7, column: 4, offset: 42 },
              end: { line: 7, column: 8, offset: 46 },
            },
          },
        ],
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
        diagnostics: [
          {
            severity: "error",
            scope: "query",
            phase: "source",
            code: "FRONTMATTER_INVALID",
            message: "Map keys must be unique",
            assetId: "post",
            path: "posts/broken.md",
            line: 4,
            column: 1,
          },
        ],
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
