/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/app/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "esbuild-jest",
      {
        // This is needed for inline snapshots to work
        // See: https://github.com/aelbore/esbuild-jest#setting-up-jest-config-file-with-transformoptions
        sourcemap: true,
        loaders: {
          ".test.ts": "tsx",
        },
      },
    ],
    "^.+\\.webp$": "@webstudio-is/jest-config/file-transform",
  },
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/app/$1",
  },
  // extensionsToTreatAsEsm: [".ts", ".tsx"],
};
