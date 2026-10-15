import { TRPCClientError } from "@trpc/client";
import { z } from "zod";
import { describe, expect, test } from "vitest";
import { parseError } from "./error-parse";

const createRpcError = (data?: unknown) =>
  TRPCClientError.from({
    error: { code: -32600, message: "Request failed", data },
  });

describe("parseError", () => {
  test("normalizes structured RPC validation errors for any UI consumer", () => {
    const error = createRpcError({
      httpStatus: 400,
      issues: [
        { code: "invalid_format", path: ["email"], message: "Invalid email" },
        { code: "too_small", path: ["name"], message: "Name is required" },
      ],
    });
    expect(parseError(error)).toEqual({
      status: 400,
      message: "Invalid email, Name is required",
    });
  });

  test("normalizes local validation errors through the same interface", () => {
    const result = z
      .object({ email: z.email() })
      .safeParse({ email: "invalid" });
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(parseError(result.error)).toEqual({
      status: 400,
      message: result.error.issues[0].message,
    });
  });

  test("ignores malformed issues while retaining valid messages", () => {
    expect(
      parseError(
        createRpcError({
          httpStatus: 400,
          issues: [
            null,
            "bad payload",
            { message: 42 },
            { message: "" },
            { message: "Invalid email" },
          ],
        })
      )
    ).toEqual({ status: 400, message: "Invalid email" });
  });

  test.each([
    undefined,
    {},
    { httpStatus: 403 },
    { httpStatus: 400, issues: [] },
    { httpStatus: 400, issues: "invalid" },
  ])(
    "keeps the RPC message when validation details are unavailable: %j",
    (data) => {
      expect(parseError(createRpcError(data))).toMatchObject({
        message: "Request failed",
      });
    }
  );

  test("does not accept an invalid HTTP status from the RPC payload", () => {
    expect(parseError(createRpcError({ httpStatus: 200 }))).toEqual({
      status: 500,
      message: "Request failed",
    });
  });

  test("preserves ordinary error handling", () => {
    expect(parseError(new Error("Network unavailable"))).toEqual({
      status: 500,
      message: "Network unavailable",
    });
  });

  test("preserves route error status and display text", () => {
    expect(
      parseError({
        status: 404,
        statusText: "Not Found",
        internal: false,
        data: "Project is unavailable",
      })
    ).toMatchObject({
      status: 404,
      statusText: "Not Found",
      message: "Project is unavailable",
    });
  });
});
