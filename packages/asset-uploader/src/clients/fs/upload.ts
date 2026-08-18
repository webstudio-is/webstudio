import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buffer } from "node:stream/consumers";
import {
  applyAssetDataOverride,
  type AssetData,
  type AssetDataOverride,
  getAssetData,
} from "../../utils/get-asset-data";
import { createSizeLimiter } from "../../utils/size-limiter";
import type { AssetInfoFallback } from "../../client";

export const uploadToFs = async ({
  name,
  type,
  data: dataStream,
  maxSize,
  fileDirectory,
  assetInfoFallback,
  assetDataOverride,
}: {
  name: string;
  type: string;
  data: AsyncIterable<Uint8Array>;
  maxSize: number;
  fileDirectory: string;
  assetInfoFallback: AssetInfoFallback | undefined;
  assetDataOverride?: AssetDataOverride;
}): Promise<AssetData> => {
  const filepath = resolve(fileDirectory, name);

  await mkdir(dirname(filepath), { recursive: true }).catch(() => {});
  const limitSize = createSizeLimiter(maxSize, name);

  const data = await buffer(limitSize(dataStream));
  const assetData = applyAssetDataOverride(
    type.startsWith("video") && assetInfoFallback !== undefined
      ? {
          size: data.byteLength,
          format: assetInfoFallback.format,
          meta: {
            width: assetInfoFallback.width,
            height: assetInfoFallback.height,
          },
        }
      : await getAssetData({
          type: type.startsWith("image")
            ? "image"
            : type === "font"
              ? "font"
              : "file",
          size: data.byteLength,
          data,
          name,
        }),
    assetDataOverride
  );

  await writeFile(filepath, data);
  return assetData;
};
