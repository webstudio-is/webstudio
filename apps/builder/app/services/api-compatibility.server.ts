import { TRPCError } from "@trpc/server";
import {
  createApiCompatibilityPayload,
  type ApiClient,
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

export const assertCliProjectSettingsContract = (
  client: ApiClient | "unknown" | undefined,
  include: ReadonlySet<string>
) => {
  if (
    client === "cli" &&
    include.has("pages") &&
    include.has("projectSettings") === false
  ) {
    throwApiClientUpdateRequired("cli");
  }
};
