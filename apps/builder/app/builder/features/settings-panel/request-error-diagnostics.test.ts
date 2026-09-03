import { describe, expect, test } from "vitest";
import {
  getRequestErrorDiagnostics,
  getRequestSourceDiagnostics,
} from "./request-error-diagnostics";

describe("request error diagnostics", () => {
  test("keeps every structured source diagnostic", () => {
    expect(
      getRequestSourceDiagnostics({
        diagnostics: [
          {
            severity: "error",
            code: "invalid-mdx",
            message: "First error",
            path: "one.mdx",
            line: 2,
            column: 1,
          },
          {
            severity: "warning",
            code: "unsafe-mdx",
            message: "Second warning",
            path: "two.mdx",
          },
        ],
      })
    ).toHaveLength(2);
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
