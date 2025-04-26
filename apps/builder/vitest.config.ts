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
  },
  // resolve webstudio condition in tests
  ssr: {
    resolve: {
      conditions: ["webstudio", "node", "development|production"],
      // conditions: ["webstudio", ...defaultServerConditions],
    },
  },
});
