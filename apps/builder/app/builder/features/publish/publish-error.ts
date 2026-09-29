import { TRPCClientError } from "@trpc/client";

export const prePublishTimeoutMessage =
  "Pre-publish checks timed out. Publishing was not started. Please try again.";

export const getPrePublishErrorMessage = (error: unknown) => {
  const response =
    error instanceof TRPCClientError && error.meta?.response instanceof Response
      ? error.meta.response
      : undefined;
  if (
    response !== undefined &&
    (response.status === 504 ||
      response.headers.get("x-vercel-error") === "FUNCTION_INVOCATION_TIMEOUT")
  ) {
    return prePublishTimeoutMessage;
  }
  const message = error instanceof Error ? error.message : undefined;
  if (/^Document .+ could not be loaded$/.test(message ?? "")) {
    return "A linked content document could not be loaded. Check that the linked file still exists and its source is available, then try again.";
  }
  return message ?? "Content database validation failed";
};
