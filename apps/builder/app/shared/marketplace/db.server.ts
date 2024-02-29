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

  const ids = products
    .map((product) => product.thumbnailAssetId)
    .filter(<T>(value: T): value is NonNullable<T> => value !== undefined);

  const assets =
    ids.length > 0
      ? await prisma.asset.findMany({
          where: {
            id: {
              in: ids,
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
