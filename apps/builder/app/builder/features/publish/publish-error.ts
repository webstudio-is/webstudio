import { TrpcHttpError } from "~/shared/trpc/trpc-http-error";

export const prePublishTimeoutMessage =
  "Pre-publish checks timed out. Publishing was not started. Please try again.";

const findTrpcHttpError = (error: unknown) => {
  if (error instanceof TrpcHttpError) {
    return error;
  }
  if (error instanceof Error && error.cause instanceof TrpcHttpError) {
    return error.cause;
  }
};

export const getPrePublishErrorMessage = (error: unknown) => {
  const httpError = findTrpcHttpError(error);
  if (
    httpError !== undefined &&
    (httpError.status === 504 ||
      httpError.platformError === "FUNCTION_INVOCATION_TIMEOUT")
  ) {
    return prePublishTimeoutMessage;
  }
  return error instanceof Error
    ? error.message
    : "Content database validation failed";
};
