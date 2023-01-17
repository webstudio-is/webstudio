import { env } from "@webstudio-is/remix";

// Environment variables we want to send to the UI inlined in the document.
// Never use a private key here, because it will become public.
export default {
  SENTRY_DSN: env.SENTRY_DSN,
  VERCEL_ENV: env.VERCEL_ENV,
  DEBUG: env.DEBUG,
  FEATURES: env.FEATURES,
  DESIGNER_HOST: env.DESIGNER_HOST,
} as const;
