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
    "^.+\\.tsx?$": require.resolve("./esbuild-jest.js"),
    "^.+\\.webp$": require.resolve("./file-transform.js"),
  },
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  prettierPath: null,
};
