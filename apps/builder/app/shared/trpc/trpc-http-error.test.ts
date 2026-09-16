import { describe, expect, test } from "vitest";
import { ensureTrpcJsonResponse, TrpcHttpError } from "./trpc-http-error";

describe("ensureTrpcJsonResponse", () => {
  test.each([
    "application/json",
    "application/json; charset=utf-8",
    "application/problem+json",
  ])("accepts %s", (contentType) => {
    const response = new Response("{}", {
      headers: { "content-type": contentType },
    });

    expect(() => ensureTrpcJsonResponse(response)).not.toThrow();
  });

  test("preserves details from a platform timeout", () => {
    const response = new Response("An error occurred with your deployment", {
      status: 504,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "retry-after": "120",
        "x-vercel-error": "FUNCTION_INVOCATION_TIMEOUT",
        "x-vercel-id": "iad1::request-id",
      },
    });

    expect(() => ensureTrpcJsonResponse(response)).toThrowError(
      expect.objectContaining<Partial<TrpcHttpError>>({
        name: "TrpcHttpError",
        message: "Request failed with status 504 (FUNCTION_INVOCATION_TIMEOUT)",
        status: 504,
        platformError: "FUNCTION_INVOCATION_TIMEOUT",
        requestId: "iad1::request-id",
        retryAfter: "120",
        contentType: "text/plain; charset=utf-8",
      })
    );
  });

  test("rejects an HTML error response before tRPC parses it as JSON", () => {
    const response = new Response("<!DOCTYPE html>", {
      status: 504,
      headers: { "content-type": "text/html; charset=UTF-8" },
    });

    expect(() => ensureTrpcJsonResponse(response)).toThrowError(
      expect.objectContaining({
        message: "Request failed with status 504",
        status: 504,
      })
    );
  });

  test("rejects a successful non-JSON response", () => {
    const response = new Response("OK", {
      headers: { "content-type": "text/plain" },
    });

    expect(() => ensureTrpcJsonResponse(response)).toThrowError(
      "Expected a JSON response"
    );
  });
});
