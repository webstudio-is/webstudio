import {
  defaultClientConditions,
  defaultServerConditions,
  defineConfig,
} from "vite";
import { createRequire } from "node:module";
import pkg from "./package.json";

const require = createRequire(import.meta.url);
const nodeDecodeNamedCharacterReference =
  require.resolve("decode-named-character-reference");

const externalDependencies = new Set(
  Object.keys(pkg.dependencies).filter((name) => {
    return name.startsWith("@webstudio-is/") === false;
  })
);

const bundledDependencies = new Set(["acorn"]);

const getPackageName = (id: string) => {
  if (id.startsWith("@")) {
    return id.split("/").slice(0, 2).join("/");
  }
  return id.split("/")[0];
};

export const isExternal = (id: string) => {
  const packageName = getPackageName(id);
  return (
    id.startsWith("node:") ||
    (externalDependencies.has(packageName) &&
      bundledDependencies.has(packageName) === false)
  );
};

export default defineConfig({
  resolve: {
    alias: {
      "decode-named-character-reference": nodeDecodeNamedCharacterReference,
    },
    conditions: ["webstudio", ...defaultClientConditions],
  },
  ssr: {
    resolve: {
      conditions: ["webstudio", ...defaultServerConditions],
    },
  },
  build: {
    target: "node22",
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
