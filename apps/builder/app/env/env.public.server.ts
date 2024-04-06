/**
 * .server.ts extension is required for this file to work with env-getter utility
 **/
import serverEnv from "./env.server";

/**
 * Environment variables we want to send to the UI inlined in the document.
 * Never use a private key here, because it will become public.
 **/
const env = {
  FEATURES: process.env.FEATURES,

  IMAGE_BASE_URL: serverEnv.IMAGE_BASE_URL,
  ASSET_BASE_URL: serverEnv.ASSET_BASE_URL,
} as const;

export default env;

export type PublicEnv = typeof env;
