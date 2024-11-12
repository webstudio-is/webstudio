import { defineConfig } from "vite";

export default defineConfig({
  // resolve only webstudio condition in tests
  resolve: {
    conditions: ["webstudio"],
  },
});
