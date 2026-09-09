import { describe, expect, test } from "vitest";
import {
  getCliErrorIssues,
  getCliErrorMessage,
  getStableErrorCode,
  isMissingApiAccessError,
} from "./error-codes";
import { BuilderRuntimeError } from "@webstudio-is/project-build/runtime";

describe("getStableErrorCode", () => {
  test("reads direct stable error codes", () => {
    expect(
      getStableErrorCode(Object.assign(new Error("Busy"), { code: "BUSY" }))
    ).toBe("BUSY");
  });

  test("reads http-client wrapped error codes", () => {
    expect(
      getStableErrorCode(
        Object.assign(new Error("Not found"), { data: { code: "NOT_FOUND" } })
      )
    ).toBe("NOT_FOUND");
  });

  test("prefers a specific nested Webstudio error code", () => {
    expect(
      getStableErrorCode({
        code: "BAD_REQUEST",
        data: { code: "BAD_REQUEST", webstudioCode: "STALE_INDEX" },
      })
    ).toBe("STALE_INDEX");
  });

  test("reads a stable Webstudio error code from an error cause", () => {
    expect(
      getStableErrorCode(
        Object.assign(new Error("Asset query failed"), {
          cause: { webstudioCode: "CONTENT_DECODING_FAILED" },
        })
      )
    ).toBe("CONTENT_DECODING_FAILED");
  });

  test("looks through generic MCP and internal error wrappers", () => {
    expect(
      getStableErrorCode({
        code: "MCP_TOOL_FAILED",
        cause: {
          code: "INTERNAL_ERROR",
          cause: { webstudioCode: "INVALID_REQUEST" },
        },
      })
    ).toBe("INVALID_REQUEST");
  });

  test("rejects dynamic values as stable error codes", () => {
    expect(getStableErrorCode({ code: "customer-specific-code" })).toBe(
      undefined
    );
  });
});

describe("getCliErrorIssues", () => {
  test("preserves complete asset diagnostic fields", () => {
    expect(
      getCliErrorIssues({
        data: {
          issues: [
            {
              code: "invalid-mdx",
              path: ["posts/broken.mdx"],
              message: "Unexpected end of file",
              constraint: "invalid-mdx",
              severity: "error",
              scope: "query",
              phase: "source",
              assetId: "asset-1",
              line: 4,
              column: 9,
              nodeType: "mdxJsxFlowElement",
              reason: "Closing tag is missing",
              sourceRange: {
                start: { line: 4, column: 1, offset: 30 },
                end: { line: 4, column: 9, offset: 38 },
              },
            },
          ],
        },
      })
    ).toEqual([
      expect.objectContaining({
        code: "invalid-mdx",
        path: ["posts/broken.mdx"],
        severity: "error",
        scope: "query",
        phase: "source",
        assetId: "asset-1",
        line: 4,
        column: 9,
        nodeType: "mdxJsxFlowElement",
        reason: "Closing tag is missing",
        sourceRange: {
          start: { line: 4, column: 1, offset: 30 },
          end: { line: 4, column: 9, offset: 38 },
        },
      }),
    ]);
  });
});

describe("getCliErrorMessage", () => {
  test("formats actionable semantic issues for human output", () => {
    const error = new BuilderRuntimeError(
      "INVALID_INPUT",
      "Operation input is invalid.",
      {
        issues: [
          {
            code: "invalid_type",
            path: ["values", "title"],
            message: "Expected a string",
            constraint: "type:string",
            example: "Pricing",
          },
        ],
      }
    );

    expect(getCliErrorMessage(error)).toBe(
      'Operation input is invalid.\nvalues.title: Expected a string (type:string). Example: "Pricing".'
    );
  });

  test("turns API procedure skew into actionable CLI update guidance", () => {
    const error = {
      data: {
        apiCompatibility: {
          type: "webstudioApiCompatibilityError",
          reason: "apiProcedureNotFound",
          target: "cli",
          message:
            "This version of the Webstudio CLI is incompatible with the current API.",
          action: { type: "updateCli" },
        },
      },
    };

    expect(getCliErrorMessage(error)).toContain(
      "npm install -g webstudio@latest"
    );
    expect(getCliErrorMessage(error)).toContain("npx webstudio@latest mcp");
    expect(getCliErrorMessage(error, "update-page")).toContain(
      "npx webstudio@latest update-page"
    );
  });

  test("explains missing Builder API access for opaque project owner token errors", () => {
    const error = Object.assign(
      new Error("Project owner can't be found for token token-1"),
      { data: { code: "INTERNAL_SERVER_ERROR" } }
    );

    expect(isMissingApiAccessError(error)).toBe(true);
    expect(getCliErrorMessage(error)).toBe(
      "This project cannot be accessed through the Builder API with the current share link/token. Enable API access in the share-link settings, then relink the project with `webstudio init --link <share-link> --json`."
    );
  });
});
