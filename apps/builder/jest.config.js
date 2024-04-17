// eslint-disable-next-line @typescript-eslint/no-var-requires
import baseConfig from "@webstudio-is/jest-config";

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
export default {
  ...baseConfig,
  testMatch: ["<rootDir>/app/**/*.test.ts"],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/app/$1",
  },
};
