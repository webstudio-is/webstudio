import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import type { BuildPatchTransaction } from "./build-patch-core";

const contentNamespaces = new Set(["props"]);

export const getRequiredPermitForBuildPatchTransaction = (
  transaction: BuildPatchTransaction
): AuthPermit => {
  for (const change of transaction.payload) {
    if (change.patches.length === 0) {
      continue;
    }
    if (contentNamespaces.has(change.namespace) === false) {
      return "build";
    }
  }
  return "edit";
};
