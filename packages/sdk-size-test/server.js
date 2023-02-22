/* eslint-disable func-style */
import { createPagesFunctionHandler } from "@remix-run/cloudflare-pages";
// eslint-disable-next-line import/no-internal-modules
import * as build from "@remix-run/dev/server-build";

const handleRequest = createPagesFunctionHandler({
  build,
  mode: process.env.NODE_ENV,
  getLoadContext: (context) => context.env,
});

export const onRequest = (context) => {
  return handleRequest(context);
};
