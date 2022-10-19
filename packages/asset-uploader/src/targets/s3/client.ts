import { S3Client } from "@aws-sdk/client-s3";
import { S3Env } from "../../schema";

export const getS3Client = () => {
  const s3Env = S3Env.parse(process.env);
  return new S3Client({
    endpoint: s3Env.S3_ENDPOINT,
    region: s3Env.S3_REGION,
    credentials: {
      accessKeyId: s3Env.S3_ACCESS_KEY_ID,
      secretAccessKey: s3Env.S3_SECRET_ACCESS_KEY,
    },
  });
};
