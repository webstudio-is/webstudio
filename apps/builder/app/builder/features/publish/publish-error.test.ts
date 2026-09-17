import { describe, expect, test } from "vitest";
import { TRPCClientError } from "@trpc/client";
import {
  getPrePublishErrorMessage,
  prePublishTimeoutMessage,
} from "./publish-error";

describe("getPrePublishErrorMessage", () => {
  test("describes a gateway timeout in terms of the publish flow", () => {
    const response = new Response("<!DOCTYPE html>", {
      status: 504,
      headers: { "content-type": "text/html" },
    });
    const error = TRPCClientError.from(
      new SyntaxError("Unexpected token '<'"),
      { meta: { response } }
    );

    expect(getPrePublishErrorMessage(error)).toBe(prePublishTimeoutMessage);
  });

  test("recognizes the Vercel timeout code", () => {
    const response = new Response("Timed out", {
      status: 500,
      headers: { "x-vercel-error": "FUNCTION_INVOCATION_TIMEOUT" },
    });
    const error = TRPCClientError.from(new SyntaxError("Unexpected token"), {
      meta: {
        response,
      },
    });

    expect(getPrePublishErrorMessage(error)).toBe(prePublishTimeoutMessage);
  });
});
