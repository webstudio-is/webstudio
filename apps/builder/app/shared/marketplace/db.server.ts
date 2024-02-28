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
        select: { buildId: true },
      },
    },
  });

  const buildIdProjectIdMap = new Map();
  for (const project of projects) {
    if (project.latestBuild) {
      buildIdProjectIdMap.set(project.latestBuild.buildId, project.id);
    }
  }

  const builds = await prisma.build.findMany({
    where: {
      id: {
        in: Array.from(buildIdProjectIdMap.keys()),
      },
    },
    select: { id: true, marketplaceProduct: true },
  });

  // @todo move this?
  const products = [];
  for (const build of builds) {
    const marketplaceProduct = MarketplaceProduct.parse(
      JSON.parse(build.marketplaceProduct)
    );
    const projectId = buildIdProjectIdMap.get(build.id);
    if (projectId) {
      products.push({
        projectId: projectId,
        ...marketplaceProduct,
      });
    }
  }

  const assets = await prisma.asset.findMany({
    where: {
      id: {
        in: products.map((product) => product.thumbnailAssetId!),
      },
    },
  });

  return products.map((product) => {
    return {
      ...product,
      thumbnailAssetName: assets.find(
        (asset) => asset.id === product.thumbnailAssetId
      )?.name,
    };
  });
};
