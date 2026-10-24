import { TRPCError } from "@trpc/server";

type ApiErrorOptions = {
  webstudioCode?: string;
  issues?: unknown;
};

export const throwApiError = (
  code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT",
  message: string,
  options: ApiErrorOptions = {}
): never => {
  const errorOptions =
    code === "NOT_FOUND" && options.webstudioCode === undefined
      ? { ...options, webstudioCode: code }
      : options;
  const cause =
    errorOptions.webstudioCode === undefined &&
    errorOptions.issues === undefined
      ? undefined
      : Object.assign(new Error(message), errorOptions);
  throw new TRPCError({ code, message, cause });
};
