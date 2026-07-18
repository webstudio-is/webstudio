import {
  ListObjectsV2Command,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import type { AssetResourceIndexAuditStore } from "@webstudio-is/asset-resource";

export const createS3ResourceIndexAuditStore = ({
  endpoint,
  region,
  accessKeyId,
  secretAccessKey,
  bucket,
}: {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}): AssetResourceIndexAuditStore => {
  const config: S3ClientConfig = {
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  };
  const client = new S3Client(config);
  return {
    listKeys: async (prefix) => {
      const keys: string[] = [];
      let continuationToken: string | undefined;
      do {
        const page = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          })
        );
        for (const object of page.Contents ?? []) {
          if (object.Key !== undefined) {
            keys.push(object.Key);
          }
        }
        continuationToken = page.IsTruncated
          ? page.NextContinuationToken
          : undefined;
        if (page.IsTruncated && continuationToken === undefined) {
          throw new Error("R2 object listing omitted its continuation token");
        }
      } while (continuationToken !== undefined);
      return keys.sort();
    },
  };
};
