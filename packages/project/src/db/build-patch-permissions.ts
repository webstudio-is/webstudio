import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import type { BuildPatchTransaction } from "./build-patch-core";
import {
  validateContentModeTransaction,
  type ContentModeCapabilities,
} from "../content-mode-permissions";

export const getRequiredPermitForBuildPatchTransaction = (
  transaction: BuildPatchTransaction,
  capabilities: ContentModeCapabilities
): AuthPermit => {
  return validateContentModeTransaction({ capabilities, transaction }).success
    ? "edit"
    : "build";
};
