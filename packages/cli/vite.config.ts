import {
  defaultClientConditions,
  defaultServerConditions,
  defineConfig,
} from "vite";
import pkg from "./package.json";

const getPackageName = (id: string) => {
  if (id.startsWith("@")) {
    return id.split("/").slice(0, 2).join("/");
  }
  return id.split("/")[0];
};

const isCliSourceImporter = (importer: string | undefined) =>
  importer?.includes("/packages/cli/") === true;

const isExternal = (id: string, importer: string | undefined) => {
  if (id.startsWith("@webstudio-is/")) {
    return false;
  }
  if (id.startsWith("node:")) {
    return true;
  }
  if (id.startsWith("@")) {
    const packageName = getPackageName(id);
    if (packageName in pkg.dependencies === false) {
      if (isCliSourceImporter(importer)) {
        throw Error(
          `${packageName} imported from ${importer} is not found in direct dependencies`
        );
      }
      return false;
    }
    return true;
  }
  if (id.includes(".") === false) {
    const packageName = getPackageName(id);
    if (packageName in pkg.dependencies === false) {
      if (isCliSourceImporter(importer)) {
        throw Error(
          `${packageName} imported from ${importer} is not found in direct dependencies`
        );
      }
      return false;
    }
    return true;
  }
  return false;
};

export default defineConfig({
  // resolve webstudio condition in tests
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
