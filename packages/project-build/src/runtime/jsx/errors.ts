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
      example: "<section><h2>Title</h2></section>",
      ...(detail === undefined
        ? {}
        : { detail: sanitizeValidationDetail(detail) }),
    },
  ]);
