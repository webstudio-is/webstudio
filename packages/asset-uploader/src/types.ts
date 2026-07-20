import type { Asset } from "@webstudio-is/sdk";

export type AssetType = "image" | "font" | "video" | "file";

export type UploadTicket = {
  assetId: Asset["id"];
  name: string;
  deduplicated: boolean;
  asset?: Asset;
};
