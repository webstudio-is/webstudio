import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import type { BuildPatchTransaction } from "./build-patch-core";

type BuildPatchChange = BuildPatchTransaction["payload"][number];

const isEditorSafeChange = (change: BuildPatchChange) => {
  if (change.namespace === "instances" || change.namespace === "props") {
    return true;
  }

  return (
    change.namespace === "pages" &&
    change.patches.every((patch) => {
      const [collection, pageId, field] = patch.path;
      return (
        collection === "pages" &&
        typeof pageId === "string" &&
        ((patch.path.length === 3 &&
          (field === "name" || field === "path" || field === "title")) ||
          (patch.path.length === 4 && field === "meta"))
      );
    })
  );
};

export const getRequiredPermitForBuildPatchTransaction = (
  transaction: BuildPatchTransaction
): AuthPermit => {
  return transaction.payload.every(isEditorSafeChange) ? "edit" : "build";
};
