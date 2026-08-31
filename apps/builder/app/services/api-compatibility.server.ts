import { TRPCError } from "@trpc/server";
import {
  createApiCompatibilityPayload,
  type ApiCompatibilityTarget,
} from "@webstudio-is/trpc-interface/api-compatibility";

export const throwApiClientUpdateRequired = ({
  expectedVersion,
  receivedVersion,
  target,
}: {
  expectedVersion: string | number;
  receivedVersion: string | number | undefined;
  target: ApiCompatibilityTarget;
}): never => {
  const compatibility = createApiCompatibilityPayload({
    reason: "clientVersionUnsupported",
    target,
  });
  const message = `${compatibility.message} Expected bundle version ${expectedVersion}, received ${receivedVersion ?? "missing"}.`;
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message,
    cause: {
      ...compatibility,
      message,
    },
  });
};
