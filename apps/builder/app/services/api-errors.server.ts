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
  const cause =
    options.webstudioCode === undefined && options.issues === undefined
      ? undefined
      : Object.assign(new Error(message), options);
  throw new TRPCError({ code, message, cause });
};
