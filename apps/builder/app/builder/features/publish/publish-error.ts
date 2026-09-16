import { TrpcHttpError } from "~/shared/trpc/trpc-http-error";

export const prePublishTimeoutMessage =
  "Pre-publish checks timed out. Publishing was not started. Please try again.";

export const getPrePublishErrorMessage = (error: unknown) => {
  if (
    error instanceof TrpcHttpError &&
    (error.status === 504 ||
      error.platformError === "FUNCTION_INVOCATION_TIMEOUT")
  ) {
    return prePublishTimeoutMessage;
  }
  return error instanceof Error
    ? error.message
    : "Content database validation failed";
};
