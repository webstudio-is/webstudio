module.exports = {
  root: true,
  // This tells ESLint to load the config from the package `eslint-config-custom`
  extends: ["@webstudio-is/eslint-config-custom"],
  ignorePatterns: [
    "*.d.ts",
    "codemod",
    "packages/*/lib",
    "packages/prisma-client/prisma/migrations",
    "apps/builder/api",
  ],
};
