import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma, Asset } from "@webstudio-is/prisma-client";
import { deleteAssetInDb } from "./db";
import { s3EnvVariables } from "./schema";
import { s3Client } from "./targets/s3/client";

export const deleteAsset = async ({ id }: { id: string }): Promise<Asset> => {
  const s3Envs = s3EnvVariables.parse(process.env);
  const currentAsset = await prisma?.asset.findUnique({
    where: { id },
  });
  if (currentAsset && currentAsset.name) {
    if (currentAsset.location === "REMOTE") {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: s3Envs.S3_BUCKET,
          Key: currentAsset?.name,
        })
      );

      return await deleteAssetInDb(id);
    }
  }
  throw new Error("Asset does not exist");
};
