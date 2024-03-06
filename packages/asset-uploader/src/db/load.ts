import { prisma, type Project } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import type { Asset } from "@webstudio-is/sdk";
import { formatAsset } from "../utils/format-asset";

export const loadAssetsByProject = async (
  projectId: Project["id"],
  context: AppContext,
  { skipPermissionsCheck = false }: { skipPermissionsCheck?: boolean } = {}
): Promise<Asset[]> => {
  const canRead =
    skipPermissionsCheck ||
    (await authorizeProject.hasProjectPermit(
      { projectId, permit: "view" },
      context
    ));

  if (canRead === false) {
    throw new AuthorizationError(
      "You don't have access to this project assets"
    );
  }

  const assets = await prisma.asset.findMany({
    select: {
      file: true,
      id: true,
      projectId: true,
    },
    where: {
      projectId,
      file: { status: "UPLOADED" },
    },
    orderBy: {
      file: { createdAt: "desc" },
    },
  });

  return assets.map((asset) =>
    formatAsset({
      assetId: asset.id,
      projectId: asset.projectId,
      file: asset.file,
    })
  );
};
