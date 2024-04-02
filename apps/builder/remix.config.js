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
    "strip-indent",
    "change-case",
    "title-case",
    "react-field-sizing-content",
    "bcp-47",
    "is-alphanumerical",
    "is-alphabetical",
    "is-decimal",
  ],
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  watchPaths: () => {
    return ["../../packages/*/lib/**/*.js"];
  },
};
