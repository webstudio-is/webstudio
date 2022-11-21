/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      require.resolve("babel-jest"),
      {
        presets: ["@babel/typescript", "@babel/react"],
      },
    ],
    "^.+\\.webp$": require.resolve("./file-transform.js"),
  },
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
};
