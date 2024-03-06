import { prisma } from "@webstudio-is/prisma-client";
import { MarketplaceProduct } from "@webstudio-is/project-build";
import type { BuildData, MarketplaceOverviewItem } from "./types";
import {
  loadProdBuildByProjectId,
  parseConfig,
} from "@webstudio-is/project-build/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { Project } from "@webstudio-is/project";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";

export const getBuildProdData = async (
  { projectId }: { projectId: Project["id"] },
  context: AppContext
): Promise<BuildData> => {
  const build = await loadProdBuildByProjectId(projectId, {
    marketplaceApprovalStatus: "APPROVED",
  });

  const assets = await loadAssetsByProject(projectId, context, {
    skipPermissionsCheck: true,
  });

  return {
    assets: assets.map((asset) => [asset.id, asset]),
    build,
  };
};

export const getItems = async (): Promise<Array<MarketplaceOverviewItem>> => {
  const projects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      marketplaceApprovalStatus: "APPROVED",
      NOT: {
        latestBuild: null,
      },
    },
    select: {
      id: true,
      latestBuild: {
        select: {
          build: {
            select: { id: true, marketplaceProduct: true },
          },
        },
      },
    },
  });
  const items = [];

  for (const project of projects) {
    if (project.latestBuild === null) {
      continue;
    }

    const parsedProduct = MarketplaceProduct.safeParse(
      parseConfig(project.latestBuild.build.marketplaceProduct)
    );

    if (parsedProduct.success === false) {
      console.error(parsedProduct.error.formErrors.fieldErrors);
      continue;
    }

    items.push({
      projectId: project.id,
      ...parsedProduct.data,
    });
  }
  const assetIds = items
    .map((item) => item.thumbnailAssetId)
    .filter((value): value is string => value != null);

  const assets =
    assetIds.length > 0
      ? await prisma.asset.findMany({
          where: {
            id: {
              in: assetIds,
            },
          },
        })
      : [];

  return items.map((item) => {
    return {
      ...item,
      thumbnailAssetName: assets.find(
        (asset) => asset.id === item.thumbnailAssetId
      )?.name,
    };
  });
};
