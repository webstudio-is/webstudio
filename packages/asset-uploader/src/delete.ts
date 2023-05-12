import { prisma, type Project } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import type { AssetClient } from "./client";
import type { Asset } from "./schema";
import { formatAsset } from "./utils/format-asset";

export const deleteAssets = async (
  props: {
    ids: Array<Asset["id"]>;
    projectId: Project["id"];
  },
  context: AppContext,
  client: AssetClient
): Promise<Array<Asset>> => {
  const canDelete = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "edit" },
    context
  );

  if (canDelete === false) {
    throw new AuthorizationError(
      "You don't have access to delete this project assets"
    );
  }

  const assets = await prisma.asset.findMany({
    select: {
      file: true,
      id: true,
      projectId: true,
      name: true,
      location: true,
    },
    where: { id: { in: props.ids }, projectId: props.projectId },
  });

  if (assets.length === 0) {
    throw new Error("Assets not found");
  }

  await prisma.asset.deleteMany({
    where: { id: { in: props.ids }, projectId: props.projectId },
  });

  // find unused files
  const unusedFileNames = new Set(assets.map((asset) => asset.name));
  const assetsByStillUsedFileName = await prisma.asset.findMany({
    where: { name: { in: Array.from(unusedFileNames) } },
  });
  for (const asset of assetsByStillUsedFileName) {
    unusedFileNames.delete(asset.name);
  }

  // delete unused files
  await prisma.file.deleteMany({
    where: { name: { in: Array.from(unusedFileNames) } },
  });
  for (const name of unusedFileNames) {
    await client.deleteFile(name);
  }

  return assets.map((asset) => formatAsset(asset, asset.file));
};
