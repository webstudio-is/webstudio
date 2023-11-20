import type { ErrorResponse, Tokens } from "../types";

export const createErrorResponse = ({
  status,
  error,
  message,
  debug,
  tokens,
}: {
  status?: number;
  error?: string;
  message: string;
  debug?: string;
  tokens?: Tokens;
}): ErrorResponse => ({
  type: "json",
  success: false,
  tokens: tokens || {
    prompt: -1,
    completion: -1,
  },
  data: {
    status: status || 500,
    error: error || "ai.unknownError",
    message: message || "Something went wrong",
    debug: debug || undefined,
  },
});
