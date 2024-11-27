import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buffer } from "node:stream/consumers";
import { type AssetData, getAssetData } from "../../utils/get-asset-data";
import { createSizeLimiter } from "../../utils/size-limiter";

export const uploadToFs = async ({
  name,
  type,
  data: dataStream,
  maxSize,
  fileDirectory,
}: {
  name: string;
  type: string;
  data: AsyncIterable<Uint8Array>;
  maxSize: number;
  fileDirectory: string;
}): Promise<AssetData> => {
  const filepath = resolve(fileDirectory, name);

  await mkdir(dirname(filepath), { recursive: true }).catch(() => {});
  const limitSize = createSizeLimiter(maxSize, name);

  const data = await buffer(limitSize(dataStream));
  await writeFile(filepath, data);

  const assetData = await getAssetData({
    type: type.startsWith("image") ? "image" : "font",
    size: data.byteLength,
    data,
    name,
  });

  return assetData;
};
