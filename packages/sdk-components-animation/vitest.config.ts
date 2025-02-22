import { defineConfig } from "vitest/config";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const isFolderEmpty = (folderPath: string) => {
  if (!existsSync(folderPath)) {
    return true; // Folder does not exist
  }
  const contents = readdirSync(folderPath);

  return contents.length === 0;
};

const hasPrivateFolders = !isFolderEmpty(
  path.join(__dirname, "../../packages/sdk-components-animation/private-src")
);

const conditions = hasPrivateFolders
  ? ["webstudio-private", "webstudio"]
  : ["webstudio"];

export default defineConfig({
  resolve: {
    conditions,
  },
  ssr: {
    resolve: {
      conditions,
    },
  },
  test: {
    passWithNoTests: true,
    workspace: [
      {
        extends: "./vitest.config.ts",
        test: {
          include: ["**/*.browser.{test,spec}.ts"],
          name: "browser",
          browser: {
            provider: "playwright", // or 'webdriverio'
            enabled: true,
            headless: true,
            screenshotFailures: false,
            instances: [{ browser: "chromium" }, { browser: "firefox" }],
          },
        },
      },
      {
        extends: "./vitest.config.ts",
        test: {
          include: ["!**/*.browser.{test,spec}.ts", "**/*.{test,spec}.ts"],

          name: "unit",
          environment: "node",
        },
      },
    ],
  },
  server: {
    watch: {
      ignored: [],
    },
  },
});
