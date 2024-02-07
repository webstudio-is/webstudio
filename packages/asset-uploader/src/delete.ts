import { prisma, type Project } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import type { Asset } from "@webstudio-is/sdk";

export const deleteAssets = async (
  props: {
    ids: Array<Asset["id"]>;
    projectId: Project["id"];
  },
  context: AppContext
) => {
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
    },
    where: { id: { in: props.ids }, projectId: props.projectId },
  });

  if (assets.length === 0) {
    throw new Error("Assets not found");
  }

  await prisma.project.update({
    where: { id: props.projectId },
    data: {
      previewImageAssetId: null,
    },
  });

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
  await prisma.file.updateMany({
    where: { name: { in: Array.from(unusedFileNames) } },
    data: {
      isDeleted: true,
    },
  });
};
