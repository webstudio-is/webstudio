import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Location } from "@webstudio-is/prisma-client";
import { getAssetData } from "../../utils/get-asset-data";
import { toUint8Array } from "../../utils/to-uint8-array";
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
}) => {
  const filepath = resolve(fileDirectory, name);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  await mkdir(dirname(filepath), { recursive: true }).catch(() => {});
  const limitSize = createSizeLimiter(maxSize, name);

  const data = await toUint8Array(limitSize(dataStream));
  await writeFile(filepath, data);

  const assetData = await getAssetData({
    type: type.startsWith("image") ? "image" : "font",
    size: data.byteLength,
    data,
    location: Location.FS,
  });

  return assetData;
};
