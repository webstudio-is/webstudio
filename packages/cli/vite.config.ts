import { defineConfig } from "vite";
import pkg from "./package.json";

const isExternal = (id: string, importer: string | undefined) => {
  if (id.startsWith("@webstudio-is/")) {
    return false;
  }
  if (id.startsWith("node:")) {
    return true;
  }
  if (id.startsWith("@")) {
    const packageName = id.split("/").slice(0, 2).join("/");
    if (packageName in pkg.dependencies === false) {
      throw Error(
        `${packageName} imported from ${importer} is not found in direct dependencies`
      );
    }
    return true;
  }
  if (id.includes(".") === false) {
    const [packageName] = id.split("/");
    if (packageName in pkg.dependencies === false) {
      throw Error(
        `${packageName} imported from ${importer} is not found in direct dependencies`
      );
    }
    return true;
  }
  return false;
};

export default defineConfig({
  // resolve only webstudio condition in tests
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
