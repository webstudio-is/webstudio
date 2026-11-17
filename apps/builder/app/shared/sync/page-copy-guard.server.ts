import { loadAssetDataByProject } from "@webstudio-is/asset-uploader/server";
import { getPageCopyAssetCatalogRevision } from "@webstudio-is/project-build/transfer";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { z } from "zod";

const copyGuard = z.object({
  buildId: z.string(),
  baseVersion: z.number().int().nonnegative(),
  assetCatalogRevision: z.string().regex(/^[0-9a-f]{64}$/),
});

export const validatePageCopyGuard = async ({
  guard,
  context,
  projectId,
  buildId,
  version,
  loadAssets = loadAssetDataByProject,
}: {
  guard: unknown;
  context: AppContext;
  projectId: string;
  buildId: string;
  version: number;
  loadAssets?: typeof loadAssetDataByProject;
}) => {
  const parsed = copyGuard.safeParse(guard);
  if (
    !parsed.success ||
    parsed.data.buildId !== buildId ||
    parsed.data.baseVersion !== version
  ) {
    return false;
  }
  const { assets, assetFolders } = await loadAssets(projectId, context, {
    skipPermissionsCheck: true,
  });
  const revision = await getPageCopyAssetCatalogRevision(
    assets,
    new Map(assetFolders.map((folder) => [folder.id, folder]))
  );
  return revision === parsed.data.assetCatalogRevision;
};
