/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  // When running locally in development mode, we use the built-in remix
  // server. This does not understand the vercel lambda module format,
  // so we default back to the standard build output.
  server: process.env.NODE_ENV === "development" ? undefined : "./server.ts",
  serverBuildPath: "api/index.js",
  serverDependenciesToBundle: [
    /@webstudio-is\/(?!prisma-client)/,
    "pretty-bytes",
    "nanoevents",
    "nanostores",
    "@nanostores/react",
    /micromark/,
    "decode-named-character-reference",
    "character-entities",
    /mdast-/,
    "unist-util-stringify-position",
  ],
  future: {
    v2_errorBoundary: true,
    v2_headers: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
};
