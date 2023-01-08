/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  serverBuildTarget: "cloudflare-workers",
  devServerBroadcastDelay: 1000,
  ignoredRouteFiles: ["**/.*"],
};
