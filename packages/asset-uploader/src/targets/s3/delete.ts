import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3EnvVariables } from "../../schema";
import { getS3Client } from "../../targets/s3/client";

export const deleteFromS3 = async (name: string) => {
  const s3Envs = S3EnvVariables.parse(process.env);
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: s3Envs.S3_BUCKET,
      Key: name,
    })
  );
};
