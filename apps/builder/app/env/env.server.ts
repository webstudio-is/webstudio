// @todo zod parse env, make explicit types i.e
const env = {
  // Authentication
  DEV_LOGIN: process.env.DEV_LOGIN,
  GH_CLIENT_ID: process.env.GH_CLIENT_ID,
  GH_CLIENT_SECRET: process.env.GH_CLIENT_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

  // Secret session key, context encode
  AUTH_SECRET: process.env.AUTH_SECRET,

  // DEPLOYMENT_ENVIRONMENT development | preview | production
  DEPLOYMENT_ENVIRONMENT: process.env.DEPLOYMENT_ENVIRONMENT,
  DEPLOYMENT_URL: process.env.DEPLOYMENT_URL,

  // Trpc on SaaS
  TRPC_SERVER_URL: process.env.TRPC_SERVER_URL,
  TRPC_SERVER_API_TOKEN: process.env.TRPC_SERVER_API_TOKEN,

  PORT: process.env.PORT,

  // Assets
  MAX_UPLOAD_SIZE: process.env.MAX_UPLOAD_SIZE,

  // Remote assets
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_REGION: process.env.S3_REGION,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_ACL: process.env.S3_ACL,
  /**
   * Origin of service implementing /cdn-cgi/image/ cloudflare endpoint
   * without ending slash
   */
  RESIZE_ORIGIN: process.env.RESIZE_ORIGIN,

  /**
   * Entri API credentials
   */
  ENTRI_APPLICATION_ID: process.env.ENTRI_APPLICATION_ID ?? "webstudio",
  ENTRI_SECRET: process.env.ENTRI_SECRET,

  /**
   * Projects as templates in dashboard
   */
  PROJECT_TEMPLATES:
    process.env.PROJECT_TEMPLATES?.split(",").map((projectId) =>
      projectId.trim()
    ) ?? [],

  PUBLISHER_HOST: process.env.PUBLISHER_HOST || "wstd.work",

  STAGING_USERNAME: process.env.STAGING_USERNAME ?? "admin",
  STAGING_PASSWORD: process.env.STAGING_PASSWORD ?? "webstudio",

  FEATURE_FLAGS: process.env.FEATURE_FLAGS ?? "",

  // Plan definitions for local dev / staging.
  // JSON array of {name, features} objects; features are validated against PlanFeaturesSchema,
  // then all entries are merged together (booleans: any, numbers: max).
  // Example: PLANS='[{"name":"Pro","features":{"canDownloadAssets":true,"maxWorkspaces":5}}]'
  PLANS: process.env.PLANS ?? "[]",

  POSTGREST_URL: process.env.POSTGREST_URL ?? "http://localhost:3000",
  POSTGREST_API_KEY: process.env.POSTGREST_API_KEY ?? "",

  /** Payment worker base URL (e.g. https://apps.webstudio.is/builder-payments) */
  PAYMENT_WORKER_URL: process.env.PAYMENT_WORKER_URL ?? "",
  /** Shared secret token for authenticating requests to the payment worker */
  PAYMENT_WORKER_TOKEN: process.env.PAYMENT_WORKER_TOKEN ?? "",

  SECURE_COOKIE: true,

  // Used for project oauth login flow
  AUTH_WS_CLIENT_ID: process.env.AUTH_WS_CLIENT_ID ?? "12345",
  AUTH_WS_CLIENT_SECRET: process.env.AUTH_WS_CLIENT_SECRET ?? "12345678",
};

// Reject default OAuth secrets in production.
if (
  env.DEPLOYMENT_ENVIRONMENT === "production" &&
  (env.AUTH_WS_CLIENT_ID === "12345" ||
    env.AUTH_WS_CLIENT_SECRET === "12345678")
) {
  throw new Error(
    "AUTH_WS_CLIENT_ID and AUTH_WS_CLIENT_SECRET must be set in production"
  );
}

export type ServerEnv = typeof env;

// https://vercel.com/docs/concepts/projects/environment-variables#system-environment-variables
if (process.env.VERCEL !== undefined) {
  if (env.DEPLOYMENT_ENVIRONMENT === undefined) {
    env.DEPLOYMENT_ENVIRONMENT = process.env.VERCEL_ENV;
  }
  if (env.DEPLOYMENT_URL === undefined) {
    env.DEPLOYMENT_URL = process.env.VERCEL_URL;
  }
}

export default env;
