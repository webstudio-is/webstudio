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
    "^lexical$": "lexical/Lexical.dev.js",
    "^@lexical/headless$": "@lexical/headless/LexicalHeadless.dev.js",
    "^@lexical/utils$": "@lexical/utils/LexicalUtils.dev.js",
    "^@lexical/selection$": "@lexical/selection/LexicalSelection.dev.js",
    "^@lexical/link$": "@lexical/link/LexicalLink.dev.js",
    "^@lexical/react/LexicalComposerContext$":
      "@lexical/react/LexicalComposerContext.dev.js",
  },
};
