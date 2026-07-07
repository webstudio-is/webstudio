import { customErrorFactory } from "ts-custom-error";

export const AuthorizationError = customErrorFactory(
  function AuthorizationError(message: string) {
    this.message = message;
  }
);

export const PlanRequiredError = customErrorFactory(function PlanRequiredError(
  message: string
) {
  this.message = message;
  this.code = "PLAN_REQUIRED";
});

/**
 * Standard response for any client-server communication with an error.
 */
export const createErrorResponse = (error: unknown) => {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unknown error";
  return {
    success: false as const,
    error: message,
  };
};
