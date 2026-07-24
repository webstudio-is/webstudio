import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "~",
        replacement: resolve("app"),
      },
    ],
    conditions: ["webstudio", "browser", "development|production"],
  },
  ssr: {
    resolve: {
      conditions: ["webstudio", "node", "development|production"],
    },
  },
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [["**/*.server.test.*", "node"]],
    setupFiles: ["@webstudio-is/design-system/test-setup"],
  },
});
