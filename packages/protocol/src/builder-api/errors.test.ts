import { expect, test } from "vitest";
import { isPublicApiRemoteErrorCode } from "./errors";

test("recognizes public API remote error codes", () => {
  for (const code of [
    "BAD_REQUEST",
    "CONFLICT",
    "FORBIDDEN",
    "INTERNAL_SERVER_ERROR",
    "NOT_FOUND",
    "UNAUTHORIZED",
  ]) {
    expect(isPublicApiRemoteErrorCode(code)).toBe(true);
  }

  expect(isPublicApiRemoteErrorCode("UNKNOWN")).toBe(false);
});
