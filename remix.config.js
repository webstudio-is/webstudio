/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { env } = require("./app/shared/env/env-check");

/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildDirectory: "api/_build",
  ignoredRouteFiles: [".*"],
};
