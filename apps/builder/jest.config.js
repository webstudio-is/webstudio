// eslint-disable-next-line @typescript-eslint/no-var-requires
const baseConfig = require("@webstudio-is/jest-config");

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  ...baseConfig,
  testMatch: ["<rootDir>/app/**/*.test.ts"],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/app/$1",
  },
};
