import { prisma, type Project } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import type { AssetClient } from "./client";
import { deleteFromDb } from "./db";
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
    throw new Error("You don't have access to delete this project assets");
  }

  const assets = await prisma.asset.findMany({
    where: { id: { in: props.ids }, projectId: props.projectId },
  });

  if (assets.length === 0) {
    throw new Error("Assets not found");
  }

  await deleteFromDb(props, context);

  const assetsByName = await prisma.asset.findMany({
    where: { name: { in: assets.map((asset) => asset.name) } },
  });
  const stillUsedNames = new Set(assetsByName.map((asset) => asset.name));

  for (const asset of assets) {
    if (stillUsedNames.has(asset.name)) {
      continue;
    }

    await client.deleteFile(asset.name);
  }

  return assets.map(formatAsset);
};
