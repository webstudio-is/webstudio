import { defineConfig } from "vitest/config";
import { existsSync } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import { browserTestPorts } from "../../scripts/vitest-browser-workspace";

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
  optimizeDeps: {
    include: ["react/jsx-dev-runtime"],
  },
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
            api: { port: browserTestPorts.sdkComponentsAnimation },
            instances: [{ browser: "chromium" }, { browser: "firefox" }],
            fileParallelism: false,
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
