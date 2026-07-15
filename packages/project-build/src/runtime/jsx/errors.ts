import {
  sanitizeValidationDetail,
  throwBuilderValidationError,
} from "../errors";

export const getErrorMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return String(error);
};

export const throwWebstudioJsxValidationError = (
  message: string,
  constraint: string,
  detail?: string
): never =>
  throwBuilderValidationError(sanitizeValidationDetail(message), [
    {
      code: "invalid_webstudio_jsx",
      path: ["fragment"],
      message: "Invalid Webstudio JSX fragment",
      constraint,
      example:
        '<ws.element ws:tag="section"><ws.element ws:tag="h2">Title</ws.element></ws.element>',
      ...(detail === undefined
        ? {}
        : { detail: sanitizeValidationDetail(detail) }),
    },
  ]);
