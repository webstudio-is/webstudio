// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import unicorn from "eslint-plugin-unicorn";

export default tseslint.config({
  files: ["**/*.{ts,tsx}"],
  ignores: [
    "**/*.d.ts",
    "**/__generated__/**",
    "codemod/**",
    "packages/*/lib/**",
    "packages/prisma-client/prisma/migrations/**",
    "packages/cli/templates/**",
    "fixtures/**",
    "packages/sdk-components-animation/private-src/polyfill/**",
    "packages/sdk-components-animation/private-src/perf/**",
  ],
  extends: [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
      plugins: {
        "react-hooks": /** @type {any} */ (reactHooks),
        unicorn,
      },
    },
  ],
  // @ts-ignore
  rules: {
    ...reactHooks.configs.recommended.rules,
    "no-console": ["error", { allow: ["info", "warn", "error"] }],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-unused-expressions": "off",
    "func-style": ["error", "expression", { allowArrowFunctions: true }],
    curly: "error",
    eqeqeq: ["error", "always", { null: "ignore" }],
    camelcase: ["error", { properties: "never" }],
    radix: "error",
    "unicorn/filename-case": ["error", { case: "kebabCase" }],
    "unicorn/prefer-node-protocol": "error",
    "no-restricted-syntax": [
      "error",
      {
        message:
          "Do not import default from React, use a named imports instead",
        selector:
          'ImportDeclaration[source.value="react"] ImportDefaultSpecifier',
      },
    ],
  },
});
