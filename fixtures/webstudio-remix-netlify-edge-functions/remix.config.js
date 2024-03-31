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
          "change-case",
          "title-case",
        ],
      };

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  ...baseConfig,
};
