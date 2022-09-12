import { Asset as DbAsset, Location } from "@webstudio-is/prisma-client";
import { FsEnvVariables, S3EnvVariables } from "../schema";
import path from "path";

const s3Envs = S3EnvVariables.safeParse(process.env);
const fsEnvs = FsEnvVariables.parse(process.env);

export const getAssetPath = (asset: DbAsset) => {
  if (asset.location === Location.FS) {
    const splitPath = fsEnvs.FILE_UPLOAD_PATH.split("public");
    return path.join("/", splitPath[splitPath.length - 1], asset.name);
  }

  if (asset.location === Location.REMOTE && s3Envs.success) {
    if (s3Envs.data.ASSET_CDN_URL) {
      const cndUrl = new URL(s3Envs.data.ASSET_CDN_URL);
      cndUrl.pathname = asset.name;
      return cndUrl.toString();
    }
    const s3Url = new URL(s3Envs.data.S3_ENDPOINT);
    s3Url.hostname = `${s3Envs.data.S3_BUCKET}.${s3Url.hostname}`;
    s3Url.pathname = asset.name;
    return s3Url.toString();
  }

  return "";
};
