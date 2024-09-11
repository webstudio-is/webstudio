import { isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { ClientOnly } from "../client-only";
import { lazy } from "react";
import { z } from "zod";

const ErrorMessage = lazy(async () => {
  const { ErrorMessage } = await import("./error-message.client");
  return { default: ErrorMessage };
});

const PageError = z.union([
  z.string().transform((message) => ({ message, description: undefined })),
  z.object({
    message: z.string(),
    description: z.string().optional(),
  }),
]);

const parseErrorObject = (
  error: unknown
): {
  status: number;
  statusText?: string;
  message: string;
  description?: string;
} => {
  if (error instanceof Error) {
    return {
      message: error.message,
      status: 500,
    };
  }

  if (isRouteErrorResponse(error)) {
    const parsed = PageError.safeParse(error.data);

    if (parsed.success) {
      return {
        message: parsed.data.message,
        description: parsed.data.description,
        status: error.status,
        statusText: error.statusText,
      };
    }

    return {
      message: error.data ? JSON.stringify(error.data) : "unknown error",
      status: error.status,
      statusText: error.statusText,
    };
  }

  const parsed = PageError.safeParse(error);
  if (parsed.success) {
    return {
      message: parsed.data.message,
      description: parsed.data.description,
      status: 1001,
    };
  }

  return {
    message: JSON.stringify(error ?? "unknown error"),
    status: 1001,
    statusText: undefined,
  };
};

export const ErrorBoundary = () => {
  const rawError = useRouteError();

  const error = parseErrorObject(rawError);

  return (
    <ClientOnly>
      <ErrorMessage error={error} />
    </ClientOnly>
  );
};
