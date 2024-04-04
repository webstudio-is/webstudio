import { resolve } from "node:path";
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import { netlifyPlugin } from "@netlify/remix-edge-adapter/plugin";

export default defineConfig({
  plugins: [remix(), netlifyPlugin()],
  resolve: {
    alias: [
      {
        find: "~",
        replacement: resolve("app"),
      },
    ],
  },
});
