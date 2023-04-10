import { type Asset as DbAsset, Location } from "@webstudio-is/prisma-client";
import { S3Env } from "../schema";

const s3Envs = S3Env.safeParse(process.env);

export const getAssetPath = (asset: DbAsset) => {
  if (asset.location === Location.FS) {
    return asset.name;
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
