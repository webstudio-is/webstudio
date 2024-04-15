/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  serverModuleFormat: "cjs",
  serverDependenciesToBundle: [
    /@webstudio-is\//,
    "nanoid",
    "change-case",
    "title-case",
  ],
};
