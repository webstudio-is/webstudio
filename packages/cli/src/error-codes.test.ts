import { describe, expect, test } from "vitest";
import {
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
