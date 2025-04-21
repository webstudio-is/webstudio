import type { AssetData } from "./utils/get-asset-data";

export type AssetClient = {
  uploadFile: (
    name: string,
    type: string,
    data: AsyncIterable<Uint8Array>,
    assetInfoFallback:
      | { width: number; height: number; format: string }
      | undefined
  ) => Promise<AssetData>;
};
