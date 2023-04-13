/**
 * .server.ts extension is required for this file to work with env-getter utility
 **/
import serverEnv from "./env.server";

const getCdnUrlFromS3 = () => {
  const S3_ENDPOINT = process.env.S3_ENDPOINT;
  const S3_BUCKET = process.env.S3_BUCKET;
  if (S3_ENDPOINT === undefined || S3_BUCKET === undefined) {
    return undefined;
  }
  const s3Url = new URL(S3_ENDPOINT);
  s3Url.hostname = `${S3_BUCKET}.${s3Url.hostname}`;
  return s3Url.toString();
};

/**
 * Environment variables we want to send to the UI inlined in the document.
 * Never use a private key here, because it will become public.
 **/
const env = {
  SENTRY_DSN: process.env.SENTRY_DSN,
  DEPLOYMENT_ENVIRONMENT: serverEnv.DEPLOYMENT_ENVIRONMENT,
  DEBUG: process.env.DEBUG,
  FEATURES: process.env.FEATURES,
  BUILDER_HOST: process.env.BUILDER_HOST,
  PUBLISHER_ENDPOINT: process.env.PUBLISHER_ENDPOINT || null,
  PUBLISHER_HOST: process.env.PUBLISHER_HOST || null,
  BUILD_REQUIRE_SUBDOMAIN: process.env.BUILD_REQUIRE_SUBDOMAIN === "true",

  // Must be set for Vercel deployments
  RESIZE_ORIGIN: process.env.RESIZE_ORIGIN,

  ASSET_BASE_URL:
    process.env.ASSET_BASE_URL ??
    process.env.ASSET_CDN_URL ??
    process.env.ASSET_PUBLIC_PATH ??
    getCdnUrlFromS3() ??
    "/",
} as const;

export default env;

export type PublicEnv = typeof env;
