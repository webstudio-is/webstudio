// Environment variables we want to send to the UI inlined in the document.
// Never use a private key here, because it will become public.
const env = {
  SENTRY_DSN: process.env.SENTRY_DSN,
  VERCEL_ENV: process.env.VERCEL_ENV,
} as const;

export default env;

export type Env = typeof env;
