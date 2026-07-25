import { validateProjectAssetReadRange } from "@webstudio-is/project-store";
import type { AssetData, AssetDataOverride } from "./utils/get-asset-data";

export type AssetReadRange = { offset: number; length: number };

export const validateAssetReadRange = (range: AssetReadRange) => {
  try {
    validateProjectAssetReadRange(range);
  } catch {
    throw new Error("Asset read range is invalid");
  }
};

export type AssetObjectWriter = {
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

// Compatibility names for callers that predate the storage-neutral
// repository boundary.
export type AssetUploadClient = AssetObjectWriter;
export type AssetClient = AssetObjectStore;
