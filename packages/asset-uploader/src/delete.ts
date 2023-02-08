import { prisma, type Project } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";
import { deleteFromDb } from "./db";
import { Asset } from "./schema";
import { deleteFromFs } from "./targets/fs/delete";
import { deleteFromS3 } from "./targets/s3/delete";
import { formatAsset } from "./utils/format-asset";

export const deleteAssets = async (
  props: {
    ids: Array<Asset["id"]>;
    projectId: Project["id"];
  },
  context: AppContext
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

    if (asset.location === "REMOTE") {
      await deleteFromS3(asset.name);
    } else {
      await deleteFromFs(asset.name);
    }
  }

  return assets.map(formatAsset);
};
