import { describe, expect, test } from "vitest";
import { TRPCError } from "@trpc/server";
import { throwApiError } from "./api-errors.server";

describe("api errors", () => {
  test("throws public api trpc errors", () => {
    expect.assertions(2);
    try {
      throwApiError("NOT_FOUND", "Missing");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND", message: "Missing" });
    }
  });
});
