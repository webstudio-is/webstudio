module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react/jsx-runtime",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react", "@typescript-eslint", "unicorn", "import"],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "no-console": ["error", { allow: ["info", "error"] }],
    // It's too dumb to understand properly what's defined in ts
    "react/prop-types": 0,
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "func-style": ["error", "expression", { allowArrowFunctions: true }],
    curly: 2,
    eqeqeq: ["error", "always", { null: "ignore" }],
    camelcase: [2, { properties: "never" }],
    radix: 2,
    "unicorn/filename-case": ["error", { case: "kebabCase" }],
    "unicorn/prefer-node-protocol": "error",
    "import/no-internal-modules": [
      "error",
      {
        allow: [
          "**/server",
          "@lexical/react/*",
          "__generated__/*",
          "react-hot-toast/headless",
          "colord/plugins/*",
          "react/*",
          "react-dom/*",
          "@fontsource/**",
          "@fontsource-variable/**",
          "@netlify/remix-adapter/**",
          "@netlify/remix-edge-adapter/**",
        ],
      },
    ],
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
