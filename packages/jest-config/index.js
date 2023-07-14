/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  testEnvironment: "node",
  testEnvironmentOptions: {
    customExportConditions: ["source"],
  },
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      require.resolve("esbuild-jest"),
      {
        // This is needed for inline snapshots to work
        // See: https://github.com/aelbore/esbuild-jest#setting-up-jest-config-file-with-transformoptions
        sourcemap: true,
        format: "esm",
      },
    ],
    "^.+\\.webp$": require.resolve("./file-transform.js"),
  },
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
};
