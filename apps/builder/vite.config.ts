import { resolve } from "node:path";
import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";

export default defineConfig({
  plugins: [remix()],
  resolve: {
    conditions: ["webstudio", "import", "module", "browser", "default"],
    alias: [
      {
        find: "~",
        replacement: resolve("app"),
      },
    ],
  },
  ssr: {
    external: ["@webstudio-is/prisma-client"],
  },
});
