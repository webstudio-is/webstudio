require("./env-check");

/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  server:
    process.env.NODE_ENV === "development" ? undefined : "./server-vercel.js",
  serverModuleFormat: "cjs",
  serverPlatform: "node",
  serverBuildPath: "api/index.js",
  // This makes sure remix bundles monorepo packages which are always
  // sym-linked and can't be hoisted. You could also manually name packages
  // e.g. ["@webstudio-is/ui", ...]
  serverDependenciesToBundle: [
    /@webstudio-is\/.*/,
    "pretty-bytes",
    "djb2a",
    "nanostores",
    "@nanostores/react",
  ],
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  watchPaths: () => {
    return ["../../packages/**/lib/**.js"];
  },
  ignoredRouteFiles: ["**/.*"],
};
