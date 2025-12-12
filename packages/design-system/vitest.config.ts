import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["webstudio", "browser", "development|production"],
  },
  // resolve webstudio condition in tests
  ssr: {
    resolve: {
      conditions: ["webstudio", "node", "development|production"],
    },
  },
  test: {
    environment: "jsdom",
  },
});
