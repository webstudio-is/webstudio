import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3Env } from "../../schema";
import { getS3Client } from "../../targets/s3/client";

export const deleteFromS3 = async (name: string) => {
  const s3Env = S3Env.parse(process.env);
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: s3Env.S3_BUCKET,
      Key: name,
    })
  );
};
