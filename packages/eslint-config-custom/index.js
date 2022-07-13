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
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react", "@typescript-eslint", "unicorn"],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "no-console": 2,
    // It's too dumb to understand properly what's defined in ts
    "react/prop-types": 0,
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
    "react/react-in-jsx-scope": 0,
    "func-style": ["error", "expression", { allowArrowFunctions: true }],
    "unicorn/filename-case": [
      "error",
      {
        case: "kebabCase",
        // Remix routes need to contain $variable in the file name
        ignore: ["\\$"],
      },
    ],
  },
};
