import { prisma } from "@webstudio-is/prisma-client";
import { MarketplaceProduct } from "@webstudio-is/project-build";
import type { MarketplaceOverviewItem } from "./types";

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

  // @todo move this?
  const products = [];

  for (const project of projects) {
    const { latestBuild } = project;
    if (!latestBuild) {
      continue;
    }

    const marketplaceProduct = MarketplaceProduct.parse(
      JSON.parse(latestBuild.build.marketplaceProduct)
    );

    products.push({
      projectId: project.id,
      ...marketplaceProduct,
    });
  }

  const assetIds = products
    .map((product) => product.thumbnailAssetId)
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

  return products.map((product) => {
    return {
      ...product,
      thumbnailAssetName: assets.find(
        (asset) => asset.id === product.thumbnailAssetId
      )?.name,
    };
  });
};
