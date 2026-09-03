import { describe, expect, test } from "vitest";
import {
  getRequestErrorDiagnostics,
  getRequestQueryDiagnostics,
  getRequestSourceDiagnosticDescription,
  getRequestSourceDiagnosticLabel,
  getRequestSourceDiagnostics,
} from "./request-error-diagnostics";

describe("request error diagnostics", () => {
  test("keeps every structured source diagnostic", () => {
    const diagnostics = getRequestSourceDiagnostics({
      diagnostics: [
        {
          severity: "error",
          scope: "query",
          phase: "source",
          code: "invalid-mdx",
          message: "First error",
          assetId: "one",
          path: "one.mdx",
          line: 2,
          column: 1,
          reference: "#frontmatter/author",
          sourceRange: {
            start: { line: 2, column: 1, offset: 12 },
            end: { line: 2, column: 8, offset: 19 },
          },
        },
        {
          severity: "warning",
          scope: "database",
          phase: "source",
          code: "unsafe-mdx",
          message: "Second warning",
          path: "two.mdx",
        },
      ],
    });
    expect(diagnostics).toEqual([
      {
        severity: "error",
        scope: "query",
        phase: "source",
        code: "invalid-mdx",
        message: "First error",
        assetId: "one",
        path: "one.mdx",
        line: 2,
        column: 1,
        reference: "#frontmatter/author",
        sourceRange: {
          start: { line: 2, column: 1, offset: 12 },
          end: { line: 2, column: 8, offset: 19 },
        },
      },
      {
        severity: "warning",
        scope: "database",
        phase: "source",
        code: "unsafe-mdx",
        message: "Second warning",
        path: "two.mdx",
      },
    ]);
    expect(diagnostics.map(getRequestSourceDiagnosticDescription)).toEqual([
      "Current query · Source · invalid-mdx · Asset: one · Reference: #frontmatter/author · Source offsets: 12–19",
      "Published database · Source · unsafe-mdx",
    ]);
    expect(diagnostics.map(getRequestSourceDiagnosticLabel)).toEqual([
      "Error · one.mdx:2:1–2:8",
      "Warning · two.mdx",
    ]);
  });

  test("treats API file issues as source diagnostics, not query setup issues", () => {
    const details = {
      issues: [
        {
          severity: "error",
          scope: "query",
          phase: "reference",
          code: "TARGET_NOT_FOUND",
          path: ["content/post.mdx"],
          message: "Referenced author does not exist",
          constraint: "TARGET_NOT_FOUND",
          assetId: "post",
          file: "content/post.mdx",
          reference: "#frontmatter/author",
          nodeType: "mdxJsxFlowElement",
          reason: "missing-reference",
          sourceRange: {
            start: { line: 4, column: 3, offset: 31 },
            end: { line: 4, column: 22, offset: 50 },
          },
        },
      ],
    };

    const diagnostics = getRequestSourceDiagnostics(details);
    expect(diagnostics).toEqual([
      {
        severity: "error",
        scope: "query",
        phase: "reference",
        code: "TARGET_NOT_FOUND",
        message: "Referenced author does not exist",
        assetId: "post",
        path: "content/post.mdx",
        reference: "#frontmatter/author",
        nodeType: "mdxJsxFlowElement",
        reason: "missing-reference",
        sourceRange: {
          start: { line: 4, column: 3, offset: 31 },
          end: { line: 4, column: 22, offset: 50 },
        },
      },
    ]);
    expect(getRequestQueryDiagnostics(details)).toEqual([]);
    expect(getRequestSourceDiagnosticLabel(diagnostics[0])).toBe(
      "Error · content/post.mdx:4:3–4:22"
    );
    expect(getRequestSourceDiagnosticDescription(diagnostics[0])).toBe(
      "Current query · Reference · TARGET_NOT_FOUND · Asset: post · Reference: #frontmatter/author · Node type: mdxJsxFlowElement · Reason: missing-reference · Source offsets: 31–50"
    );
  });

  test("keeps every structured query setup error", () => {
    expect(
      getRequestQueryDiagnostics({
        issues: [
          {
            code: "too_small",
            path: ["query", "limit"],
            message: "Too small",
          },
          {
            severity: "warning",
            code: "custom",
            path: ["query", "sort"],
            message: "Sorting is required",
          },
        ],
      })
    ).toEqual([
      {
        severity: "error",
        code: "too_small",
        path: ["query", "limit"],
        message: "Too small",
      },
      {
        severity: "warning",
        code: "custom",
        path: ["query", "sort"],
        message: "Sorting is required",
      },
    ]);
  });

  test("distinguishes diagnostics response schema issues from query issues", () => {
    expect(
      getRequestQueryDiagnostics({
        issues: [
          {
            severity: "error",
            scope: "diagnostics",
            code: "invalid_type",
            path: ["__diagnostics__", "query", "usedBytes"],
            message: "Expected a number",
          },
        ],
      })
    ).toEqual([
      {
        severity: "error",
        context: "diagnostics",
        code: "invalid_type",
        path: ["__diagnostics__", "query", "usedBytes"],
        message: "Expected a number",
      },
    ]);
  });

  test("extracts HTTP and structured API error information", () => {
    expect(
      getRequestErrorDiagnostics({
        ok: false,
        status: 400,
        statusText: "",
        data: {
          ok: false,
          error: {
            code: "CONTENT_NOT_TEXT",
            message: "Selected binary asset cannot be embedded as text",
            retryable: false,
            details: { assetId: "asset", mimeType: "image/png" },
          },
        },
      })
    ).toEqual({
      status: 400,
      statusText: undefined,
      code: "CONTENT_NOT_TEXT",
      message: "Selected binary asset cannot be embedded as text",
      retryable: false,
      details: { assetId: "asset", mimeType: "image/png" },
    });
  });

  test("describes transport failures without a structured error", () => {
    expect(
      getRequestErrorDiagnostics({ ok: false, status: 502, data: "failure" })
    ).toMatchObject({ status: 502, message: "Request failed with status 502" });
    expect(
      getRequestErrorDiagnostics({ ok: true, status: 200, data: {} })
    ).toBeUndefined();
  });
});
