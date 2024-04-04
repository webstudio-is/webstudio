import { resolve } from "node:path";
import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";

export default defineConfig({
  plugins: [remix()],
  resolve: {
    alias: [
      {
        find: "~",
        replacement: resolve("app"),
      },
    ],
  },
});
