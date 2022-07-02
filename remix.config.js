/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildDirectory: "api/_build",
  ignoredRouteFiles: [".*"],
  // @todo https://github.com/getsentry/sentry-javascript/issues/5351
  serverDependenciesToBundle: [/@sentry\/.*/],
};
