import { describe, expect, test } from "vitest";
import { getStableErrorCode } from "./error-codes";

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
