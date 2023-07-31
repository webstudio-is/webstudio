/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  publicPath: "/build/",
  serverBuildPath: "functions/[[path]].js",
  serverConditions: ["worker"],
  serverMainFields: ["browser", "module", "main"],
  serverModuleFormat: "esm",
  serverPlatform: "neutral",
  serverDependenciesToBundle: "all",
  serverMinify: true,

  server: "./server.js",
  ignoredRouteFiles: ["**/.*"],
  serverNodeBuiltinsPolyfill: {
    modules: {
      // remix cannot build nanoid for cloudlare without polyfills
      crypto: true,
    },
  },
  future: {
    v2_errorBoundary: true,
    v2_normalizeFormMethod: true,
    v2_meta: true,
    v2_routeConvention: true,
    v2_headers: true,
  },
};
