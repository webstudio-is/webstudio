import type { AssetData, AssetDataOverride } from "./utils/get-asset-data";

export type AssetReadRange = { offset: number; length: number };

export type AssetInfoFallback = {
  width: number;
  height: number;
  format: string;
};

export const validateAssetReadRange = (range: AssetReadRange) => {
  const end = range.offset + range.length;
  if (
    Number.isSafeInteger(range.offset) === false ||
    range.offset < 0 ||
    Number.isSafeInteger(range.length) === false ||
    range.length <= 0 ||
    Number.isSafeInteger(end) === false
  ) {
    throw new Error("Asset read range is invalid");
  }
};

export type AssetObjectWriter = {
  uploadFile: (
    name: string,
    type: string,
    data: AsyncIterable<Uint8Array>,
    assetInfoFallback: AssetInfoFallback | undefined,
    assetDataOverride?: AssetDataOverride
  ) => Promise<AssetData>;
};

export type AssetObjectReader = {
  readFile: (
    name: string,
    range?: AssetReadRange
  ) => Promise<{
    data: AsyncIterable<Uint8Array>;
    contentLength?: number;
  }>;
};

export type AssetObjectStore = AssetObjectWriter & AssetObjectReader;
