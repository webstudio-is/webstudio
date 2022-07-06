// @ts-check
/**
 * This file is included in `/remix.config.js` which ensures the app isn't built with invalid env vars.
 * It has to be a `.js`-file to be imported there.
 */

/**
 *  Remix does not read .env files when building for production so this would make it to that when you tried to run yarn build locally
 * you would get an error because your environment variables are in the .env file.
 * `dot-env` makes it so that when you run this file the `process.env` is always populated with your `.env` file if it finds one,
 * if not it will read the environment variables set by your hosting provider like remix does.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

const REQUIRED_ENVS = ["DATABASE_URL", "AUTH_SECRET"];

const errors = [];

REQUIRED_ENVS.map((env) => {
  if (!process.env[env])
    errors.push(`👉 The ${env} environment variable is required`);
});

if (process.env.DEPLOYMENT_ENVIRONMENT === "production") {
  if (!process.env.DEPLOYMENT_URL) {
    errors.push(
      "👉 In production DEPLOYMENT_URL is required for website functionality. Please set it to your production URL"
    );
  }
}

if (errors.length) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment variables:");
  // eslint-disable-next-line no-console
  console.error(errors.join("\n"));
  process.exit(1);
}
