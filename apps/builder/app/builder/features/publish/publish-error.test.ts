import { describe, expect, test } from "vitest";
import { TRPCClientError } from "@trpc/client";
import { TrpcHttpError } from "~/shared/trpc/trpc-http-error";
import {
  getPrePublishErrorMessage,
  prePublishTimeoutMessage,
} from "./publish-error";

describe("getPrePublishErrorMessage", () => {
  test("describes a gateway timeout in terms of the publish flow", () => {
    const error = TRPCClientError.from(
      new TrpcHttpError(
        new Response("<!DOCTYPE html>", {
          status: 504,
          headers: { "content-type": "text/html" },
        })
      )
    );

    expect(getPrePublishErrorMessage(error)).toBe(prePublishTimeoutMessage);
  });

  test("recognizes the Vercel timeout code", () => {
    const error = new TrpcHttpError(
      new Response("Timed out", {
        status: 500,
        headers: {
          "content-type": "text/plain",
          "x-vercel-error": "FUNCTION_INVOCATION_TIMEOUT",
        },
      })
    );

    expect(getPrePublishErrorMessage(error)).toBe(prePublishTimeoutMessage);
  });

  test("preserves other error messages", () => {
    expect(getPrePublishErrorMessage(new Error("Permission denied"))).toBe(
      "Permission denied"
    );
  });

  test("uses a fallback for non-error values", () => {
    expect(getPrePublishErrorMessage(undefined)).toBe(
      "Content database validation failed"
    );
  });
});
