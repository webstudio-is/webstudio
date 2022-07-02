// @ts-check
/**
 * This file is included in `/remix.config.js` which ensures the app isn't built with invalid env vars.
 * It has to be a `.js`-file to be imported there.
 */

// Remix does not read .env files when building for production
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require("dotenv");
dotenv.config();

const REQUIRED_ENVS = ["DATABASE_URL", "AUTH_SECRET"];

const errors = [];

REQUIRED_ENVS.map((env) => {
  if (!process.env[env])
    errors.push(`👉 The ${env} environment variable is required`);
});

if (errors.length) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment variables:");
  // eslint-disable-next-line no-console
  console.error(errors.join("\n"));
  process.exit(1);
}
