import path from "path";
import {
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { s3UploadHandler } from "./targets/s3/handler";
import { uploadToS3 } from "./targets/s3/uploader";
import { uploadToDisk } from "./targets/disk/upload";
import { assetEnvVariables, fsEnvVariables, s3EnvVariables } from "./schema";
import { Asset } from "@webstudio-is/prisma-client";

const isS3Upload = s3EnvVariables.safeParse(process.env).success;
const fsUploadVars = fsEnvVariables.parse(process.env);
const commonUploadVars = assetEnvVariables.parse(process.env);

// user inputs the max value in mb and we transform it to bytes
export const MAX_UPLOAD_SIZE = parseInt(commonUploadVars.MAX_UPLOAD_SIZE) * 1e6;

export const uploadAssets = async ({
  request,
  projectId,
  dirname,
}: {
  request: Request;
  projectId: string;
  dirname: string;
}): Promise<Asset[]> => {
  const uploads = path.join(dirname, "../public");
  const directory = path.join(uploads, fsUploadVars.FILE_UPLOAD_PATH);
  const formData = await unstable_parseMultipartFormData(
    request,
    isS3Upload
      ? (file) =>
          s3UploadHandler({
            file,
            maxPartSize: MAX_UPLOAD_SIZE,
          })
      : unstable_createFileUploadHandler({
          maxPartSize: MAX_UPLOAD_SIZE,
          directory,
          file: ({ filename }) => filename,
        })
  );
  if (isS3Upload) {
    return await uploadToS3({
      projectId,
      formData,
    });
  } else {
    return await uploadToDisk({
      projectId,
      formData,
    });
  }
};
