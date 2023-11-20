const { config } = require("@netlify/remix-edge-adapter");
const baseConfig =
  process.env.NODE_ENV === "production"
    ? config
    : {
        ignoredRouteFiles: ["**/.*"],
        serverModuleFormat: "cjs",
        serverDependenciesToBundle: [
          /@webstudio-is\//,
          "nanoid",
          "@jsep-plugin/assignment",
          "change-case",
          "title-case",
        ],
      };

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  ...baseConfig,
  future: {
    v2_errorBoundary: true,
    v2_headers: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
    v2_dev: true,
  },
};
