import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["webstudio", "browser", "development|production"],
  },
  test: {
    setupFiles: ["@webstudio-is/design-system/test-setup"],
  },
});
