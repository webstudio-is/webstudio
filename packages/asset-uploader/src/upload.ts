import { S3Env, FsEnv } from "./schema";
import { uploadToFs } from "./targets/fs/upload";
import { uploadToS3 } from "./targets/s3/upload";

const isS3Upload = S3Env.safeParse(process.env).success;
const fsEnv = FsEnv.parse(process.env);

export const uploadAssets = async ({
  request,
  projectId,
}: {
  request: Request;
  projectId: string;
}) => {
  if (isS3Upload) {
    return await uploadToS3({
      request,
      projectId,
      maxSize: fsEnv.MAX_UPLOAD_SIZE,
    });
  }
  return await uploadToFs({
    request,
    projectId,
    maxSize: fsEnv.MAX_UPLOAD_SIZE,
  });
};
