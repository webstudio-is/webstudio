// @ts-check
/**
 * This file is included in `/remix.config.js` which ensures the app isn't built with invalid env vars.
 * It has to be a `.js`-file to be imported there.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const { z } = require("zod");

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(10),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  // eslint-disable-next-line no-console
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(env.error.format(), null, 4)
  );
  process.exit(1);
}
module.exports.env = env.data;
