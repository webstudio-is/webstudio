import { prisma, type Project } from "@webstudio-is/prisma-client";
import type { Asset } from "../schema";
import { formatAsset } from "../utils/format-asset";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";

export const loadByProject = async (
  projectId: Project["id"],
  context: AppContext
): Promise<Asset[]> => {
  const canRead = await authorizeProject.hasProjectPermit(
    { projectId, permit: "view" },
    context
  );

  if (canRead === false) {
    throw new Error("You don't have access to this project assets");
  }

  const assets = await prisma.asset.findMany({
    where: { projectId, status: "UPLOADED" },
    orderBy: {
      createdAt: "desc",
    },
  });

  return assets.map(formatAsset);
};

export const loadByIds = async (
  props: {
    ids: Array<Asset["id"]>;
    projectId: Project["id"];
  },
  context: AppContext
): Promise<Asset[]> => {
  const canRead = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "view" },
    context
  );

  if (canRead === false) {
    throw new Error("You don't have access to this project assets");
  }

  const assets = await prisma.asset.findMany({
    where: { projectId: props.projectId, status: "UPLOADED" },
    orderBy: {
      createdAt: "desc",
    },
  });

  return assets.map(formatAsset);
};
