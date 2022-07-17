import { DEFAULT_UPLPOAD_PATH } from "./constants";
import path from "path";
import {
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { s3UploadHandler } from "./targets/s3/handler";
import { uploadToS3 } from "./targets/s3/uploader";
import { uploadToDisk } from "./targets/disk/upload";

export const uploadAsset = async ({
  request,
  projectId,
  db,
}: {
  request: Request;
  projectId: string;
  db: unknown;
}) => {
  const IS_S3_UPLOAD =
    process.env.S3_ENDPOINT &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_ACCESS_KEY_ID;
  const uploads = path.join(__dirname, "../public");
  const folderInPublic = process.env.FILE_UPLOAD_PATH || DEFAULT_UPLPOAD_PATH;
  const directory = path.join(uploads, folderInPublic);
  try {
    const formData = await unstable_parseMultipartFormData(
      request,
      IS_S3_UPLOAD
        ? (file) => s3UploadHandler(file)
        : unstable_createFileUploadHandler({
            maxPartSize: 10_000_000,
            directory,
            file: ({ filename }) => filename,
          })
    );
    if (IS_S3_UPLOAD) {
      await uploadToS3({
        projectId,
        formData,
        db,
      });
    } else {
      await uploadToDisk({
        projectId,
        formData,
        folderInPublic,
        db,
      });
    }

    return {
      ok: true,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
  }
};
