import path from "path";
import {
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { s3UploadHandler } from "./targets/s3/handler";
import { uploadToS3 } from "./targets/s3/uploader";
import { uploadToDisk } from "./targets/disk/upload";
import { fsEnvVariables, s3EnvVariables } from "./schema";

const isS3Upload = s3EnvVariables.safeParse(process.env).success;
const fsUploadVars = fsEnvVariables.parse(process.env);

export const uploadAsset = async ({
  request,
  projectId,
  db,
  dirname,
}: {
  request: Request;
  projectId: string;
  db: unknown;
  dirname: string;
}) => {
  const uploads = path.join(dirname, "../public");
  const directory = path.join(uploads, fsUploadVars.FILE_UPLOAD_PATH);
  const formData = await unstable_parseMultipartFormData(
    request,
    isS3Upload
      ? (file) => s3UploadHandler(file)
      : unstable_createFileUploadHandler({
          maxPartSize: 10_000_000,
          directory,
          file: ({ filename }) => filename,
        })
  );
  if (isS3Upload) {
    return await uploadToS3({
      projectId,
      formData,
      db,
    });
  } else {
    return await uploadToDisk({
      projectId,
      formData,
      folderInPublic: fsUploadVars.FILE_UPLOAD_PATH,
      db,
    });
  }
};
