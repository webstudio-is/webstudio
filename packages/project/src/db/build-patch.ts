import { patchAssets } from "@webstudio-is/asset-uploader/index.server";
import type { Build } from "@webstudio-is/project-build";
import { loadRawBuildById } from "@webstudio-is/project-build/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { Project } from "./project";
import { updatePreviewImage } from "./project";
import {
  createBuildPatchUpdate,
  singlePlayerVersionMismatchResult,
  type BuildPatchChange,
  type BuildPatchTransaction,
} from "./build-patch-core";

export type { BuildPatchChange, BuildPatchTransaction };

export type PatchBuildResult =
  | { status: "ok"; version: number }
  | { status: "version_mismatched"; errors: string }
  | { status: "error"; errors: string };

export const patchBuild = async (
  {
    buildId,
    projectId,
    transactions,
    clientVersion,
  }: {
    buildId: Build["id"];
    projectId: Project["id"];
    transactions: BuildPatchTransaction[];
    clientVersion: number;
  },
  context: AppContext
): Promise<PatchBuildResult> => {
  const build = await loadRawBuildById(context, buildId);
  const result = await createBuildPatchUpdate({
    build,
    clientVersion,
    transactions,
  });

  if (result.status !== "ok") {
    return result;
  }

  if (result.update === undefined) {
    return { status: "ok", version: result.nextVersion };
  }

  // build.patch does not have the worker's atomic Build+asset commit path.
  // Apply app-side asset mutations before marking the Build with
  // lastTransactionId so a failed asset mutation is not later treated as an
  // already-saved retry.
  for (const patches of result.assetPatches) {
    await patchAssets({ projectId }, patches, context);
  }

  const update = await context.postgrest.client
    .from("Build")
    .update(result.update, { count: "exact" })
    .match({
      id: buildId,
      projectId,
      version: clientVersion,
    });

  if (update.error) {
    console.error(update.error);
    throw update.error;
  }
  if (update.count == null) {
    console.error("Update count is null");
    throw new Error("Update count is null");
  }

  if (update.count === 0) {
    return singlePlayerVersionMismatchResult;
  }

  if (result.previewImageAssetId !== undefined) {
    await updatePreviewImage(
      { assetId: result.previewImageAssetId, projectId },
      context
    );
  }

  return { status: "ok", version: result.nextVersion };
};
