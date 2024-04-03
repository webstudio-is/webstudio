import { createRequestHandler } from "@netlify/remix-adapter";
// eslint-disable-next-line import/no-internal-modules
import * as build from "@remix-run/dev/server-build";

export const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
});
