module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "unicorn"],
  rules: {
    "no-console": ["error", { allow: ["info", "error"] }],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "func-style": ["error", "expression", { allowArrowFunctions: true }],
    curly: 2,
    eqeqeq: ["error", "always", { null: "ignore" }],
    camelcase: [2, { properties: "never" }],
    radix: 2,
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
  ignorePatterns: ["*.d.ts"],
  overrides: [
    {
      files: ["**/app/routes/**/*.{ts,tsx}"],
      rules: {
        "unicorn/filename-case": "off",
      },
    },
  ],
};
