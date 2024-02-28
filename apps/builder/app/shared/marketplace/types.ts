import type { Project } from "@webstudio-is/prisma-client";
import type { MarketplaceProduct } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/sdk";

export type MarketplaceOverviewItem = MarketplaceProduct & {
  projectId: Project["id"];
  thumbnailAssetName?: Asset["name"];
};
