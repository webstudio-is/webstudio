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
  versionKind = "bundle",
}: {
  expectedVersion: string | number;
  receivedVersion: string | number | undefined;
  target: ApiCompatibilityTarget;
  versionKind?: "bundle" | "API contract";
}): never => {
  const compatibility = createApiCompatibilityPayload({
    reason: "clientVersionUnsupported",
    target,
  });
  const message = `${compatibility.message} Expected ${versionKind} version ${expectedVersion}, received ${receivedVersion ?? "missing"}.`;
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
    throwApiClientUpdateRequired({
      expectedVersion: publicApiContractVersion,
      receivedVersion: ctx.apiClient.contractVersion,
      target: "cli",
      versionKind: "API contract",
    });
  }
};
