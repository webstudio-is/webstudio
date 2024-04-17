import type { Project } from "@webstudio-is/prisma-client";
import type { Build, MarketplaceProduct } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/sdk";

export type MarketplaceOverviewItem = MarketplaceProduct & {
  projectId: Project["id"];
  thumbnailAssetName?: Asset["name"];
};

export type BuildData = {
  build: Build;
  assets: Array<[Asset["id"], Asset]>;
};
