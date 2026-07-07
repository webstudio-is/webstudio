import { expect, test } from "vitest";
import {
  AuthorizationError,
  PlanRequiredError,
  createErrorResponse,
} from "./errors.server";

test("creates authorization and plan-required errors", () => {
  expect(new AuthorizationError("No access").message).toBe("No access");

  const error = new PlanRequiredError("Upgrade required");
  expect(error.message).toBe("Upgrade required");
  expect(error.code).toBe("PLAN_REQUIRED");
});

test("creates serializable error responses", () => {
  expect(createErrorResponse(new Error("Failed"))).toEqual({
    success: false,
    error: "Failed",
  });
  expect(createErrorResponse("Nope")).toEqual({
    success: false,
    error: "Nope",
  });
});
