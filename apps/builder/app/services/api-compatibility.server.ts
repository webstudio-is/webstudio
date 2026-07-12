import { TRPCError } from "@trpc/server";
import {
  createApiCompatibilityPayload,
  type ApiCompatibilityTarget,
} from "@webstudio-is/trpc-interface/api-compatibility";

export const throwApiClientUpdateRequired = (
  target: ApiCompatibilityTarget
): never => {
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "The API client must be updated before continuing.",
    cause: createApiCompatibilityPayload({
      reason: "clientVersionUnsupported",
      target,
    }),
  });
};
