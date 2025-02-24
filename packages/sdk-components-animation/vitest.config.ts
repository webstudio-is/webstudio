import { defineConfig } from "vitest/config";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import fg from "fast-glob";

const rootDir = ["..", "../..", "../../.."]
  .map((dir) => path.join(__dirname, dir))
  .find((dir) => existsSync(path.join(dir, ".git")));

const hasPrivateFolders =
  fg.sync([path.join(rootDir ?? "", "packages/*/private-src/*")], {
    ignore: ["**/node_modules/**"],
  }).length > 0;

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
