import type { MarketplaceProduct } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/sdk";

export type MarketplaceOverviewItem = MarketplaceProduct & {
  projectId: string;
  authorizationToken?: string | undefined;
  thumbnailAssetName?: Asset["name"];
};
