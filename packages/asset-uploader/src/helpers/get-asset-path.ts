import { DbAsset, Location } from "@webstudio-is/prisma-client";
import { fsEnvVariables, s3EnvVariables } from "../schema";
import path from "path";

const s3Envs = s3EnvVariables.safeParse(process.env);
const fsEnvs = fsEnvVariables.parse(process.env);

export const getAssetPath = (asset: DbAsset) => {
  if (asset.location === Location.FS) {
    return path.join(
      "/",
      fsEnvs.FILE_UPLOAD_PATH.split("public")[1],
      asset.name
    );
  }

  if (asset.location === Location.REMOTE && s3Envs.success) {
    const s3Url = new URL(s3Envs.data.S3_ENDPOINT);

    if (s3Envs.data.ASSET_CDN_URL) {
      const cndUrl = new URL(s3Envs.data.ASSET_CDN_URL);
      cndUrl.pathname = asset.name;
      return cndUrl.toString();
    }
    s3Url.hostname = `${s3Envs.data.S3_BUCKET}.${s3Url.hostname}`;
    s3Url.pathname = asset.name;
    return s3Url.toString();
  }

  return "";
};
