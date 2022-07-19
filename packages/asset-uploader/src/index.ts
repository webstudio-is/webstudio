import { DEFAULT_UPLPOAD_PATH, S3_ENV_KEYS } from "./constants";
import path from "path";
import {
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { s3UploadHandler } from "./targets/s3/handler";
import { uploadToS3 } from "./targets/s3/uploader";
import { uploadToDisk } from "./targets/disk/upload";

const isS3Upload = Boolean(
  S3_ENV_KEYS.every((key) => Object.keys(process.env).includes(key))
);

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
  const folderInPublic = process.env.FILE_UPLOAD_PATH || DEFAULT_UPLPOAD_PATH;
  const directory = path.join(uploads, folderInPublic);
  try {
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
