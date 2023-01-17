import { setEnv } from "@webstudio-is/feature-flags";
import { env } from "@webstudio-is/remix";

// Environment variables we want to send to the UI inlined in the document.
// Never use a private key here, because it will become public.
export default {
  SENTRY_DSN: env.SENTRY_DSN,
  VERCEL_ENV: env.VERCEL_ENV,
  DEBUG: env.DEBUG,
  FEATURES: env.FEATURES,
  DESIGNER_HOST: env.DESIGNER_HOST,
  PUBLISHER_ENDPOINT: env.PUBLISHER_ENDPOINT || null,
  PUBLISHER_HOST: env.PUBLISHER_HOST || null,
  BUILD_REQUIRE_SUBDOMAIN: env.BUILD_REQUIRE_SUBDOMAIN === "true",
  // Must be set for Vercel deployments
  RESIZE_ORIGIN: env.RESIZE_ORIGIN,
} as const;

setEnv(env.FEATURES);
