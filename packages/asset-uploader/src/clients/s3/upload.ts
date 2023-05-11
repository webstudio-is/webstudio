import { z } from "zod";
import {
  unstable_parseMultipartFormData as parseMultipartFormData,
  MaxPartSizeExceededError,
} from "@remix-run/node";
import type { PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Location } from "@webstudio-is/prisma-client";
import { toUint8Array } from "../../utils/to-uint8-array";
import { getAssetData, AssetData } from "../../utils/get-asset-data";

const AssetsUploadedSuccess = z.object({
  Location: z.string(),
});

/**
 * Do not change. Upload code assumes its 1.
 */
const MAX_FILES_PER_REQUEST = 1;

export const uploadToS3 = async ({
  client,
  name,
  type,
  request,
  maxSize,
  bucket,
  acl,
}: {
  client: S3Client;
  name: string;
  type: string;
  request: Request;
  maxSize: number;
  bucket: string;
  acl?: string;
}): Promise<AssetData> => {
  const uploadHandler = createUploadHandler(MAX_FILES_PER_REQUEST, client);

  const formData = await parseMultipartFormData(request, async (file) => {
    // Do not parse if it's not a file
    if (file.filename === undefined) {
      return;
    }
    return uploadHandler({
      name,
      type,
      data: file.data,
      maxSize,
      bucket,
      acl,
    });
  });

  const file = formData.get("file") as string;

  const assetData = AssetData.parse(JSON.parse(file));

  return assetData;
};

const createUploadHandler = (maxFiles: number, client: S3Client) => {
  let count = 0;

  return async ({
    name,
    type,
    data: dataStream,
    maxSize,
    bucket,
    acl,
  }: {
    name: string;
    type: string;
    data: AsyncIterable<Uint8Array>;
    maxSize: number;
    bucket: string;
    acl?: string;
  }): Promise<string | undefined> => {
    if (count >= maxFiles) {
      // Do not throw, just ignore the file
      // In case of throw we need to delete previously uploaded files
      return;
    }

    count++;

    // @todo this is going to put the entire file in memory
    // this has to be a stream that goes directly to s3
    // Size check has to happen as you stream and interrupted when size is too big
    // Also check if S3 client has an option to check the size limit
    const data = await toUint8Array(dataStream);

    if (data.byteLength > maxSize) {
      throw new MaxPartSizeExceededError(name, maxSize);
    }

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
      location: Location.REMOTE,
    });

    return JSON.stringify(assetData);
  };
};
