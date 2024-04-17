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

export const getAllApprovedProjectIds = async (): Promise<
  Array<Project["id"]>
> => {
  const approvedMarketplaceProducts =
    await prisma.approvedMarketplaceProduct.findMany();

  return approvedMarketplaceProducts.map(
    (approvedMarketplaceProduct) => approvedMarketplaceProduct.projectId
  );
};

export const getItems = async (): Promise<Array<MarketplaceOverviewItem>> => {
  const approvedMarketplaceProducts =
    await prisma.approvedMarketplaceProduct.findMany();
  const items = [];

  for (const approvedMarketplaceProduct of approvedMarketplaceProducts) {
    const parsedProduct = MarketplaceProduct.safeParse(
      parseConfig(approvedMarketplaceProduct.marketplaceProduct)
    );

    if (parsedProduct.success === false) {
      console.error(parsedProduct.error.formErrors.fieldErrors);
      continue;
    }

    items.push({
      projectId: approvedMarketplaceProduct.projectId,
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
