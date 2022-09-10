import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@webstudio-is/prisma-client";
import { unlink } from "fs/promises";
import path from "path";
import { deleteAssetInDb } from "./db";
import { FILE_DIRECTORY } from "./targets/disk/file-path";
import { S3EnvVariables } from "./schema";
import { getS3Client } from "./targets/s3/client";
import { Asset } from "./types";

export const deleteAsset = async ({
  id,
  name,
}: {
  id: string;
  name: string;
}): Promise<Asset> => {
  const currentAsset = await prisma.asset.findUnique({
    where: { id },
  });
  if (!currentAsset) throw new Error("Asset does not exist");

  if (currentAsset.location === "REMOTE") {
    const s3Envs = S3EnvVariables.parse(process.env);
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: s3Envs.S3_BUCKET,
        Key: name,
      })
    );

    return await deleteAssetInDb(id);
  } else {
    await unlink(path.join(FILE_DIRECTORY, name));

    return await deleteAssetInDb(id);
  }
};
