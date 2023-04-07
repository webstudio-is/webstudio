import type { AssetData } from "./utils/get-asset-data";

export type AssetClient = {
  uploadFile: (request: Request) => Promise<AssetData>;
  deleteFile: (name: string) => Promise<void>;
};
