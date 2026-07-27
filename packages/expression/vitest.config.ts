import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/index.ts"],
      thresholds: {
        branches: 97,
        functions: 95,
        lines: 99,
        statements: 99,
      },
    },
  },
});
