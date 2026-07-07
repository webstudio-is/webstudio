import { TRPCError } from "@trpc/server";

export const throwApiError = (
  code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT",
  message: string
): never => {
  throw new TRPCError({ code, message });
};
