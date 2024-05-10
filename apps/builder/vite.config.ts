import { resolve } from "node:path";
import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import { vercelPreset } from "@vercel/remix/vite";

const isStorybook = process.argv[1]?.includes("storybook") ?? false;

export default defineConfig(({ mode }) => ({
  plugins: [
    isStorybook === false &&
      remix({
        presets: [vercelPreset()],
      }),
  ],
  resolve: {
    conditions: ["webstudio", "import", "module", "browser", "default"],
    alias: [
      {
        find: "~",
        replacement: resolve("app"),
      },
    ],
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  ssr: {
    external: ["@webstudio-is/prisma-client"],
  },
  envPrefix: "GITHUB_",
}));
