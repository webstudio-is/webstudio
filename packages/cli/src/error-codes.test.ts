import { describe, expect, test } from "vitest";
import {
  getCliErrorMessage,
  getStableErrorCode,
  isMissingApiAccessError,
} from "./error-codes";

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
