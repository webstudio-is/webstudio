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

export const uploadToFs = async ({
  name,
  type,
  data: dataStream,
  maxSize,
  fileDirectory,
  assetDataOverride,
}: {
  name: string;
  type: string;
  data: AsyncIterable<Uint8Array>;
  maxSize: number;
  fileDirectory: string;
  assetDataOverride?: AssetDataOverride;
}): Promise<AssetData> => {
  const filepath = resolve(fileDirectory, name);

  await mkdir(dirname(filepath), { recursive: true }).catch(() => {});
  const limitSize = createSizeLimiter(maxSize, name);

  const data = await buffer(limitSize(dataStream));
  const assetData = applyAssetDataOverride(
    await getAssetData({
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
