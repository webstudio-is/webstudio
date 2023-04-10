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
  DEBUG: process.env.DEBUG,
  FEATURES: process.env.FEATURES,
  BUILDER_HOST: process.env.BUILDER_HOST,
  PUBLISHER_ENDPOINT: process.env.PUBLISHER_ENDPOINT || null,
  PUBLISHER_HOST: process.env.PUBLISHER_HOST || null,
  BUILD_REQUIRE_SUBDOMAIN: process.env.BUILD_REQUIRE_SUBDOMAIN === "true",
  // Must be set for Vercel deployments
  RESIZE_ORIGIN: process.env.RESIZE_ORIGIN,
  // must be set for local setup
  ASSET_PUBLIC_PATH: process.env.ASSET_PUBLIC_PATH,
} as const;

export default env;

export type PublicEnv = typeof env;
