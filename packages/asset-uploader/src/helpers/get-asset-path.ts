import { Asset, Location } from "@webstudio-is/prisma-client";
import { fsEnvVariables, s3EnvVariables } from "../schema";
import path from "path";

const s3Envs = s3EnvVariables.safeParse(process.env);
const fsEnvs = fsEnvVariables.parse(process.env);

export const getAssetPath = (asset: Asset) => {
  if (asset.location === Location.FS) {
    return path.join("/", fsEnvs.FILE_UPLOAD_PATH, asset.name);
  }

  if (asset.location === Location.REMOTE && s3Envs.success) {
    const s3Url = new URL(s3Envs.data.S3_ENDPOINT);

    if (s3Envs.data.WORKER_URL) {
      const r2Url = new URL(s3Envs.data.WORKER_URL);
      r2Url.pathname = asset.name;
      return r2Url.toString();
    }
    s3Url.hostname = `${s3Envs.data.S3_BUCKET}.${s3Url.hostname}`;
    s3Url.pathname = asset.name;
    return s3Url.toString();
  }

  return "";
};
