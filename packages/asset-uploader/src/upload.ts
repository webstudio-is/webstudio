import { z } from "zod";
import { MAX_UPLOAD_SIZE } from "./constants";
import { S3EnvVariables } from "./schema";
import { uploadToFs } from "./targets/fs/upload";
import { uploadToS3 } from "./targets/s3/upload";

const AssetEnvVariables = z.object({
  MAX_UPLOAD_SIZE: z.string().optional().default(MAX_UPLOAD_SIZE),
});

const isS3Upload = S3EnvVariables.safeParse(process.env).success;
const commonUploadVars = AssetEnvVariables.parse(process.env);

// user inputs the max value in mb and we transform it to bytes
const maxSize = parseFloat(commonUploadVars.MAX_UPLOAD_SIZE) * 1e6;

export const uploadAssets = async ({
  request,
  projectId,
}: {
  request: Request;
  projectId: string;
}) => {
  try {
    if (isS3Upload) {
      return await uploadToS3({ request, projectId, maxSize });
    }
    return await uploadToFs({ request, projectId, maxSize });
  } catch (error) {
    if (error instanceof Error && "maxBytes" in error) {
      throw new Error(
        `Asset cannot be bigger than ${commonUploadVars.MAX_UPLOAD_SIZE}MB`
      );
    }
    throw error;
  }
};
