import type { AssetData } from "./utils/get-asset-data";

export type AssetClient = {
  uploadFile: (
    name: string,
    type: string,
    data: AsyncIterable<Uint8Array>
  ) => Promise<AssetData>;
  deleteFile: (name: string) => Promise<void>;
};
