import { AssetEnvVariables, S3EnvVariables } from "./schema";
import { uploadToFs } from "./targets/fs/upload";
import { uploadToS3 } from "./targets/s3/upload";

const isS3Upload = S3EnvVariables.safeParse(process.env).success;
const commonUploadVars = AssetEnvVariables.parse(process.env);

// user inputs the max value in mb and we transform it to bytes
const MAX_UPLOAD_SIZE = parseFloat(commonUploadVars.MAX_UPLOAD_SIZE) * 1e6;

export const uploadAssets = async ({
  request,
  projectId,
}: {
  request: Request;
  projectId: string;
}) => {
  try {
    if (isS3Upload) {
      return await uploadToS3({ request, projectId, maxSize: MAX_UPLOAD_SIZE });
    }
    return await uploadToFs({ request, projectId, maxSize: MAX_UPLOAD_SIZE });
  } catch (error) {
    if (error instanceof Error && "maxBytes" in error) {
      throw new Error(
        `Asset cannot be bigger than ${commonUploadVars.MAX_UPLOAD_SIZE}MB`
      );
    }
    throw error;
  }
};
