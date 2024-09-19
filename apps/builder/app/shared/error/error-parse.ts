import { isRouteErrorResponse } from "@remix-run/react";
import { z } from "zod";

// Currently, we have multiple error formats, and not all of them are covered here.
// We should consolidate these formats into a single, unified format for consistency.
const PageError = z.union([
  z.string().transform((message) => ({ message, description: undefined })),
  z
    .object({
      message: z.string(),
      details: z.string(),
      hint: z.string().nullable(),
      code: z.string(),
    })
    .transform(({ message, details, hint, code }) => ({
      message,
      description: `details: ${details}; hint: ${hint}; code: ${code}`,
    })),
  z.object({
    message: z.string(),
    description: z.string().optional(),
  }),
]);

export const parseError = (
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
