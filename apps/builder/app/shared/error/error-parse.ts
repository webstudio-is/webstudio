import { TRPCClientError } from "@trpc/client";
import { isRouteErrorResponse } from "@remix-run/react";
import { z } from "zod";

// Normalize transport and validation payloads here so UI consumers only need
// the display message and status, regardless of where an error originated.
const validationErrorData = z.object({
  httpStatus: z.number().int().min(400).max(599).catch(500),
  issues: z.array(z.object({ message: z.string() })).catch([]),
});

const pageError = z.union([
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
  if (error instanceof TRPCClientError || error instanceof z.ZodError) {
    const parsed = validationErrorData.safeParse(
      error instanceof z.ZodError
        ? { httpStatus: 400, issues: error.issues }
        : error.data
    );
    const messages = parsed.success
      ? parsed.data.issues.map((issue) => issue.message)
      : [];
    return {
      status: parsed.success ? parsed.data.httpStatus : 500,
      message: messages.length === 0 ? error.message : messages.join(", "),
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: 500,
    };
  }

  if (isRouteErrorResponse(error)) {
    const parsed = pageError.safeParse(error.data);

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

  const parsed = pageError.safeParse(error);
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
