import { resolve } from "node:path";
import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import { vercelPreset } from "@vercel/remix/vite";

export default defineConfig(({ mode }) => ({
  plugins: [
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
