import { z } from "zod";
import type { PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { toUint8Array } from "../../utils/to-uint8-array";
import { getAssetData } from "../../utils/get-asset-data";
import { createSizeLimiter } from "../../utils/size-limiter";

const AssetsUploadedSuccess = z.object({
  Location: z.string(),
});

export const uploadToS3 = async ({
  client,
  name,
  type,
  data: dataStream,
  maxSize,
  bucket,
  acl,
}: {
  client: S3Client;
  name: string;
  type: string;
  data: AsyncIterable<Uint8Array>;
  maxSize: number;
  bucket: string;
  acl?: string;
}) => {
  const limitSize = createSizeLimiter(maxSize, name);

  // @todo this is going to put the entire file in memory
  // this has to be a stream that goes directly to s3
  // Size check has to happen as you stream and interrupted when size is too big
  // Also check if S3 client has an option to check the size limit
  const data = await toUint8Array(limitSize(dataStream));

  // if there is no ACL passed we do not default since some providers do not support it
  const ACL = acl ? { ACL: acl } : {};

  const params: PutObjectCommandInput = {
    ...ACL,
    Bucket: bucket,
    Key: name,
    Body: data,
    ContentType: type,
    CacheControl: "public, max-age=31536004,immutable",
    Metadata: {
      // encodeURIComponent is needed to support special characters like Cyrillic
      filename: encodeURIComponent(name) || "unnamed",
    },
  };

  const upload = new Upload({ client, params });

  AssetsUploadedSuccess.parse(await upload.done());

  const assetData = await getAssetData({
    type: type.startsWith("image") ? "image" : "font",
    size: data.byteLength,
    data,
  });

  return assetData;
};
