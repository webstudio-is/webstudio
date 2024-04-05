/**
 * .server.ts extension is required for this file to work with env-getter utility
 **/
import serverEnv from "./env.server";

/**
 * Environment variables we want to send to the UI inlined in the document.
 * Never use a private key here, because it will become public.
 **/
const env = {
  SENTRY_DSN: process.env.SENTRY_DSN,
  DEPLOYMENT_ENVIRONMENT: serverEnv.DEPLOYMENT_ENVIRONMENT,
  FEATURES: process.env.FEATURES,
  BUILDER_HOST: process.env.BUILDER_HOST,
  PUBLISHER_HOST: process.env.PUBLISHER_HOST || null,

  IMAGE_BASE_URL: serverEnv.IMAGE_BASE_URL,
  ASSET_BASE_URL: serverEnv.ASSET_BASE_URL,
} as const;

export default env;

export type PublicEnv = typeof env;
