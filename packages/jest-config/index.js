/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "esbuild-jest",
      {
        sourcemap: true,
      },
    ],
    "^.+\\.webp$": require.resolve("./file-transform.js"),
  },
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
  },
};
