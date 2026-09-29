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
  const unloadedDocument = /^Document (.+) could not be loaded$/.exec(
    message ?? ""
  );
  if (unloadedDocument !== null) {
    return `Could not load linked content document ${unloadedDocument[1]}. In Content Assets, search for this ID and restore or reconnect the file, then run publish validation again.`;
  }
  return message ?? "Content database validation failed";
};
