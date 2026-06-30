import {
  defaultClientConditions,
  defaultServerConditions,
  defineConfig,
} from "vite";
import pkg from "./package.json";

const externalDependencies = new Set(
  Object.keys(pkg.dependencies).filter((name) => {
    return name.startsWith("@webstudio-is/") === false;
  })
);

const getPackageName = (id: string) => {
  if (id.startsWith("@")) {
    return id.split("/").slice(0, 2).join("/");
  }
  return id.split("/")[0];
};

const isExternal = (id: string) =>
  id.startsWith("node:") || externalDependencies.has(getPackageName(id));

export default defineConfig({
  resolve: {
    conditions: ["webstudio", ...defaultClientConditions],
  },
  ssr: {
    resolve: {
      conditions: ["webstudio", ...defaultServerConditions],
    },
  },
  build: {
    minify: false,
    lib: {
      entry: ["src/cli.ts"],
      formats: ["es"],
    },
    rollupOptions: {
      external: isExternal,
      output: {
        dir: "lib",
      },
    },
  },
});
