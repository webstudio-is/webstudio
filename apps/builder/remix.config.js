require("./env-check");

/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  publicPath: "/build/",
  serverBuildPath: "build/index.js",

  serverMainFields: ["main", "module"],
  serverModuleFormat: "cjs",
  serverPlatform: "node",
  serverMinify: false,

  // This makes sure remix bundles monorepo packages which are always
  // sym-linked and can't be hoisted. You could also manually name packages
  // e.g. ["@webstudio-is/ui", ...]
  serverDependenciesToBundle: [
    /@webstudio-is\/(?!prisma-client)/,
    "pretty-bytes",
    "nanoid",
    "nanoevents",
    "nanostores",
    "@nanostores/react",
    /micromark/,
    /mdast-/,
    /unist-/,
    "decode-named-character-reference",
    "character-entities",
    "devlop",
    "ccount",
    "markdown-table",
    "zwitch",
    "escape-string-regexp",
    "longest-streak",
    "node-fetch",
    "immerhin",
  ],
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  watchPaths: () => {
    return ["../../packages/*/lib/**.js"];
  },
  // remix will disable all polyfills by default
  serverNodeBuiltinsPolyfill: { modules: {} },
  future: {
    v2_errorBoundary: true,
    v2_routeConvention: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_headers: true,
    v2_dev: true,
  },
};
