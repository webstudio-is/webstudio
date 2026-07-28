import { describe, expect, test } from "vitest";
import { getRequestErrorDiagnostics } from "./request-error-diagnostics";

describe("request error diagnostics", () => {
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
