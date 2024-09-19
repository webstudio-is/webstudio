import { MarketplaceProduct } from "@webstudio-is/project-build";
import type { MarketplaceOverviewItem } from "./types";
import {
  loadApprovedProdBuildByProjectId,
  parseConfig,
} from "@webstudio-is/project-build/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { Project } from "@webstudio-is/project";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";

export const getBuildProdData = async (
  { projectId }: { projectId: Project["id"] },
  context: AppContext
) => {
  const build = await loadApprovedProdBuildByProjectId(context, projectId);

  const assets = await loadAssetsByProject(projectId, context, {
    skipPermissionsCheck: true,
  });

  return {
    ...build,
    assets,
  };
};

export const getItems = async (
  context: AppContext
): Promise<Array<MarketplaceOverviewItem>> => {
  const approvedMarketplaceProducts = await context.postgrest.client
    .from("ApprovedMarketplaceProduct")
    .select();
  if (approvedMarketplaceProducts.error) {
    throw approvedMarketplaceProducts.error;
  }

  const items: MarketplaceOverviewItem[] = [];

  for (const product of approvedMarketplaceProducts.data) {
    if (product.marketplaceProduct === null || product.projectId === null) {
      continue;
    }
    const parsedProduct = MarketplaceProduct.safeParse(
      parseConfig(product.marketplaceProduct)
    );

    if (parsedProduct.success === false) {
      console.error(parsedProduct.error.formErrors.fieldErrors);
      continue;
    }

    items.push({
      projectId: product.projectId,
      authorizationToken: product.authorizationToken ?? undefined,
      ...parsedProduct.data,
    });
  }
  const assetIds = items
    .map((item) => item.thumbnailAssetId)
    .filter((value): value is string => value != null);

  const assets = new Map<string, string>();
  if (assetIds.length > 0) {
    const data = await context.postgrest.client
      .from("Asset")
      .select()
      .in("id", assetIds);
    if (data.error) {
      throw data.error;
    }
    for (const asset of data.data) {
      assets.set(asset.id, asset.name);
    }
  }

  return items.map((item) => {
    return {
      ...item,
      thumbnailAssetName: assets.get(item.thumbnailAssetId),
    };
  });
};
