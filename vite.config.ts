import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    conditions: ["webstudio", "import", "module", "browser", "default"],
  },
});
