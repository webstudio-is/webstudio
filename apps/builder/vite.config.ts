import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import { vercelPreset } from "@vercel/remix/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => ({
  plugins: [
    basicSsl({
      name: "dev",
      domains: ["wstd.dev", "*.wstd.dev"],
      certDir: ".dev/cert",
    }) as Plugin<unknown>,
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
  server: {
    host: true,
    // Needed for SSL
    proxy: {},
    https: {
      cert: ".dev/cert.pem",
      key: ".dev/key.pem",
    },
  },
  envPrefix: "GITHUB_",
}));
