import type { ImmutableAssetResourceIndexStore } from "@webstudio-is/asset-resource";
import type { AssetData, AssetDataOverride } from "./utils/get-asset-data";

export type AssetReadRange = { offset: number; length: number };

export const validateAssetReadRange = (range: AssetReadRange) => {
  if (
    Number.isSafeInteger(range.offset) === false ||
    range.offset < 0 ||
    Number.isSafeInteger(range.length) === false ||
    range.length <= 0 ||
    Number.isSafeInteger(range.offset + range.length) === false
  ) {
    throw new Error("Asset read range is invalid");
  }
};

export type AssetUploadClient = {
  uploadFile: (
    name: string,
    type: string,
    data: AsyncIterable<Uint8Array>,
    assetInfoFallback:
      | { width: number; height: number; format: string }
      | undefined,
    assetDataOverride?: AssetDataOverride
  ) => Promise<AssetData>;
};

export type AssetClient = AssetUploadClient & {
  resourceIndexStore?: ImmutableAssetResourceIndexStore;
  readFile: (
    name: string,
    range?: AssetReadRange
  ) => Promise<{
    data: AsyncIterable<Uint8Array>;
    contentLength?: number;
  }>;
};

export type AssetClientWithResourceIndexStore = AssetClient & {
  resourceIndexStore: ImmutableAssetResourceIndexStore;
};
