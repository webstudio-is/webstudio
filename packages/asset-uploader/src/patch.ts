import type { Patch } from "immer";
import {
  type AppContext,
  authorizeProject,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import { collectionConfigFilename } from "@webstudio-is/content-engine";
import { formatAssetName, type Asset } from "@webstudio-is/sdk";
import { patchAssetsWithClient } from "./asset-patch-core";
import type { AssetObjectReader } from "./client";
import {
  getCollectionFolderIds,
  getCollectionReservedAssetIds,
  validateCollectionFolder,
} from "./collection-persistence";

const collectionAssetChanged = (
  previous: Asset | undefined,
  next: Asset | undefined
) =>
  previous?.name !== next?.name ||
  previous?.filename !== next?.filename ||
  previous?.folderId !== next?.folderId;

const assetChanged = (previous: Asset | undefined, next: Asset | undefined) =>
  collectionAssetChanged(previous, next) ||
  previous?.description !== next?.description ||
  JSON.stringify(previous?.meta) !== JSON.stringify(next?.meta);

const validateCollectionAssetPatch = async ({
  current,
  next,
  assetStore,
  canBuild,
}: {
  current: ReadonlyMap<Asset["id"], Asset>;
  next: ReadonlyMap<Asset["id"], Asset>;
  assetStore: AssetObjectReader;
  canBuild: boolean;
}) => {
  const currentAssets = Array.from(current.values());
  const nextAssets = Array.from(next.values());
  const currentCollectionFolderIds = getCollectionFolderIds(currentAssets);
  const nextCollectionFolderIds = getCollectionFolderIds(nextAssets);
  const changedIds = new Set(
    [...current.keys(), ...next.keys()].filter((assetId) =>
      assetChanged(current.get(assetId), next.get(assetId))
    )
  );
  const collectionChangedIds = new Set(
    [...current.keys(), ...next.keys()].filter((assetId) =>
      collectionAssetChanged(current.get(assetId), next.get(assetId))
    )
  );
  const affectedCollectionFolderIds = new Set<string>();
  for (const assetId of changedIds) {
    const previous = current.get(assetId);
    const following = next.get(assetId);
    if (
      previous?.folderId !== undefined &&
      currentCollectionFolderIds.has(previous.folderId)
    ) {
      affectedCollectionFolderIds.add(previous.folderId);
    }
    if (
      following?.folderId !== undefined &&
      nextCollectionFolderIds.has(following.folderId)
    ) {
      affectedCollectionFolderIds.add(following.folderId);
    }
  }
  const collectionValidationFolderIds = new Set<string>();
  for (const assetId of collectionChangedIds) {
    const following = next.get(assetId);
    if (
      following?.folderId !== undefined &&
      nextCollectionFolderIds.has(following.folderId)
    ) {
      collectionValidationFolderIds.add(following.folderId);
    }
  }
  const changesCollectionConfig = Array.from(changedIds).some((assetId) => {
    const previous = current.get(assetId);
    const following = next.get(assetId);
    return (
      (previous !== undefined &&
        formatAssetName(previous) === collectionConfigFilename) ||
      (following !== undefined &&
        formatAssetName(following) === collectionConfigFilename)
    );
  });
  if (
    affectedCollectionFolderIds.size === 0 &&
    changesCollectionConfig === false
  ) {
    return;
  }

  const [currentReservedIds, nextReservedIds] = await Promise.all([
    getCollectionReservedAssetIds({
      assets: currentAssets,
      assetStore,
      folderIds: affectedCollectionFolderIds,
    }),
    getCollectionReservedAssetIds({
      assets: nextAssets,
      assetStore,
      folderIds: affectedCollectionFolderIds,
    }),
  ]);
  for (const assetId of collectionChangedIds) {
    const previous = current.get(assetId);
    if (
      previous?.folderId !== undefined &&
      currentCollectionFolderIds.has(previous.folderId) &&
      currentReservedIds.has(assetId)
    ) {
      collectionValidationFolderIds.add(previous.folderId);
    }
  }
  if (
    canBuild === false &&
    Array.from(changedIds).some(
      (assetId) =>
        currentReservedIds.has(assetId) || nextReservedIds.has(assetId)
    )
  ) {
    throw new AuthorizationError(
      "You don't have permission to configure this project collections."
    );
  }

  // The public upload and metadata APIs require the dedicated New entry flow.
  // Versioned sync patches also carry Undo/Redo, which cannot be identified
  // after an Asset row is deleted. Accept those state transitions only when
  // the complete resulting collection still satisfies its file-backed rules.
  for (const folderId of collectionValidationFolderIds) {
    if (nextCollectionFolderIds.has(folderId)) {
      await validateCollectionFolder({
        assets: nextAssets,
        folderId,
        assetStore,
      });
    }
  }
};

/**
 * patchAssets applies asset metadata updates, deletions, and undo restores after
 * the app layer confirms project edit access.
 */
export const patchAssets = async (
  {
    projectId,
    assetStore,
  }: { projectId: string; assetStore: AssetObjectReader },
  patches: Array<Patch>,
  context: AppContext
): Promise<void> => {
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );
  if (canEdit === false) {
    throw new Error("You don't have edit access to this project");
  }

  const canBuild = await authorizeProject.hasProjectPermit(
    { projectId, permit: "build" },
    context
  );

  await patchAssetsWithClient(
    { projectId, client: context.postgrest.client },
    patches,
    {
      // Undo in cloned projects can target a File row retained from the source
      // project. This path is enabled only after the edit permit check above.
      allowSharedFileRestore: true,
      validate: async ({ current, next }) =>
        validateCollectionAssetPatch({
          current,
          next,
          assetStore,
          canBuild,
        }),
    }
  );
};
