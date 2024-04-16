import { resolve } from "node:path";
import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import { staticEnv } from "./app/env/env.static.server";

const isStorybook = process.argv[1]?.includes("storybook") ?? false;

type StaticDefine = {
  [prop in keyof typeof staticEnv as `process.env.${prop}`]: string;
};

const staticDefine: Partial<StaticDefine> = {};

// It's ok to use process.env in vite config https://vitejs.dev/config/#using-environment-variables-in-config
let key: keyof typeof staticEnv;
for (key in staticEnv) {
  staticDefine[`process.env.${key}`] = JSON.stringify(process.env[key]);
}

export default defineConfig(({ mode }) => ({
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
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
    ...staticDefine,
  },
  ssr: {
    external: ["@webstudio-is/prisma-client"],
  },
}));
