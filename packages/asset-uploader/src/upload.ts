import {
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData,
  type UploadHandlerPart,
} from "@remix-run/node";
import { s3UploadHandler } from "./targets/s3/handler";
import { uploadToS3 } from "./targets/s3/uploader";
import { uploadToDisk } from "./targets/disk/upload";
import { AssetEnvVariables, S3EnvVariables } from "./schema";
import { imageFsDirectory } from "./utils/image-fs-path";

const isS3Upload = S3EnvVariables.safeParse(process.env).success;

const commonUploadVars = AssetEnvVariables.parse(process.env);

// user inputs the max value in mb and we transform it to bytes
export const MAX_UPLOAD_SIZE = parseInt(commonUploadVars.MAX_UPLOAD_SIZE) * 1e6;

const uploadHandler = async () => {
  if (isS3Upload) {
    return (file: UploadHandlerPart) =>
      s3UploadHandler({
        file,
        maxPartSize: MAX_UPLOAD_SIZE,
      });
  }

  const directory = await imageFsDirectory();
  return unstable_createFileUploadHandler({
    maxPartSize: MAX_UPLOAD_SIZE,
    directory,
    file: ({ filename }) => filename,
  });
};

const upload = async (options: { projectId: string; formData: FormData }) => {
  if (isS3Upload) {
    return await uploadToS3(options);
  }

  return await uploadToDisk(options);
};

export const uploadAssets = async ({
  request,
  projectId,
}: {
  request: Request;
  projectId: string;
}) => {
  try {
    const formData = await unstable_parseMultipartFormData(
      request,
      await uploadHandler()
    );
    return await upload({ projectId, formData });
  } catch (error) {
    if (error instanceof Error && "maxBytes" in error) {
      throw new Error(
        `Asset cannot be bigger than ${commonUploadVars.MAX_UPLOAD_SIZE}MB`
      );
    }
    throw error;
  }
};
