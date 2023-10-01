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

  // Publishing
  PUBLISHER_ENDPOINT: process.env.PUBLISHER_ENDPOINT,
  PUBLISHER_TOKEN: process.env.PUBLISHER_TOKEN,

  // DEPLOYMENT_ENVIRONMENT development | preview | production
  DEPLOYMENT_ENVIRONMENT: process.env.DEPLOYMENT_ENVIRONMENT,
  DEPLOYMENT_URL: process.env.DEPLOYMENT_URL,

  // Trpc on SaaS
  TRPC_SERVER_URL: process.env.TRPC_SERVER_URL,
  TRPC_SERVER_API_TOKEN: process.env.TRPC_SERVER_API_TOKEN,

  // Canvas build logic
  BUILD_ORIGIN: process.env.BUILD_ORIGIN,
  BUILD_REQUIRE_SUBDOMAIN: process.env.BUILD_REQUIRE_SUBDOMAIN,

  PORT: process.env.PORT,

  // Preview support
  BRANCH_NAME: process.env.BRANCH_NAME,

  // Assets
  MAX_UPLOAD_SIZE: process.env.MAX_UPLOAD_SIZE,
  MAX_ASSETS_PER_PROJECT: process.env.MAX_ASSETS_PER_PROJECT,
  /**
   * Base url ir base path for images with ending slash.
   * Possible values are
   * /asset/image/
   * https://image-transform.wstd.io/cdn-cgi/image/
   * https://webstudio.is/cdn-cgi/image/
   */
  IMAGE_BASE_URL: process.env.IMAGE_BASE_URL ?? "/asset/image/",
  /**
   * Base url or base path for any asset with ending slash.
   * Possible values are
   * /s/uploads/
   * /asset/file/
   * https://assets-dev.webstudio.is/
   * https://assets.webstudio.is/
   */
  ASSET_BASE_URL:
    process.env.ASSET_BASE_URL ??
    process.env.ASSET_CDN_URL ??
    process.env.ASSET_PUBLIC_PATH ??
    "/",

  // Local assets
  FILE_UPLOAD_PATH: process.env.FILE_UPLOAD_PATH,

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

  /**
   * OpenAI secrets for AI features
   *
   * OPENAI_KEY is a personal API key that you should generate here https://platform.openai.com/account/api-keys
   * OPENAI_ORG can be found at https://platform.openai.com/account/org-settings
   *
   * Both are mandatory as OpenAI will bill OPENAI_ORG
   */
  OPENAI_KEY: process.env.OPENAI_KEY,
  OPENAI_ORG: process.env.OPENAI_ORG,
};

export type ServerEnv = typeof env;

// https://vercel.com/docs/concepts/projects/environment-variables#system-environment-variables
if (process.env.VERCEL !== undefined) {
  if (env.DEPLOYMENT_ENVIRONMENT === undefined) {
    env.DEPLOYMENT_ENVIRONMENT = process.env.VERCEL_ENV;
  }
  if (env.DEPLOYMENT_URL === undefined) {
    env.DEPLOYMENT_URL = process.env.VERCEL_URL;
  }
  if (env.BRANCH_NAME === undefined) {
    env.BRANCH_NAME = process.env.VERCEL_GIT_COMMIT_REF;
  }
}

export default env;
