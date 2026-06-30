import { expect, test } from "vitest";
import { BuilderRuntimeError, throwBuilderRuntimeError } from "./errors";

test("creates runtime errors with stable code and name", () => {
  const error = new BuilderRuntimeError("BAD_REQUEST", "Invalid input");

  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe("BuilderRuntimeError");
  expect(error.code).toBe("BAD_REQUEST");
  expect(error.message).toBe("Invalid input");
});

test("throws runtime errors", () => {
  expect(() => throwBuilderRuntimeError("NOT_FOUND", "Missing")).toThrow(
    BuilderRuntimeError
  );
  expect(() => throwBuilderRuntimeError("CONFLICT", "Changed")).toThrow(
    "Changed"
  );
});
