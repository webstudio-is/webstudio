import { resolve } from "node:path";
import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";

const isStorybook = process.argv[1]?.includes("storybook") ?? false;

export default defineConfig({
  plugins: [isStorybook === false && remix()],
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
