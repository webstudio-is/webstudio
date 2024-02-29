import { prisma } from "@webstudio-is/prisma-client";
import { MarketplaceProduct } from "@webstudio-is/project-build";
import type { MarketplaceOverviewItem } from "./types";
import { parseConfig } from "@webstudio-is/project-build/index.server";

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

    const product = MarketplaceProduct.parse(
      parseConfig(project.latestBuild.build.marketplaceProduct)
    );

    items.push({
      projectId: project.id,
      ...product,
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
