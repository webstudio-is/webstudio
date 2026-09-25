import { TRPCError } from "@trpc/server";
import { publicApiContractVersion } from "@webstudio-is/protocol";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
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

export const assertCliApiContractVersion = (ctx: AppContext) => {
  if (
    ctx.apiClient?.type === "cli" &&
    ctx.apiClient.contractVersion !== publicApiContractVersion
  ) {
    const compatibility = createApiCompatibilityPayload({
      reason: "clientVersionUnsupported",
      target: "cli",
    });
    const message = `The Webstudio CLI and API use different editing contracts. Expected ${publicApiContractVersion}, received ${ctx.apiClient.contractVersion ?? "missing"}. Update the CLI; if it is already current, retry after the Webstudio API deployment is updated.`;
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message,
      cause: { ...compatibility, message },
    });
  }
};
