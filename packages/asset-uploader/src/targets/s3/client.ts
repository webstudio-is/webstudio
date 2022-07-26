import { S3Client } from "@aws-sdk/client-s3";
import { s3EnvVariables } from "../../schema";

export const getS3Client = () => {
  const s3Envs = s3EnvVariables.parse(process.env);
  return new S3Client({
    endpoint: s3Envs.S3_ENDPOINT,
    region: s3Envs.S3_REGION,
    credentials: {
      accessKeyId: s3Envs.S3_ACCESS_KEY_ID,
      secretAccessKey: s3Envs.S3_SECRET_ACCESS_KEY,
    },
  });
};
