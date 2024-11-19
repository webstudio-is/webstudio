import { defineConfig } from "vite";

const isBareImport = (id: string) =>
  id.startsWith("@") || id.includes(".") === false;

export default defineConfig({
  // resolve only webstudio condition in tests
  resolve: {
    conditions: ["webstudio"],
  },
  build: {
    lib: {
      entry: [
        "src/components.ts",
        "src/metas.ts",
        "src/props.ts",
        "src/hooks.ts",
      ],
      formats: ["es"],
    },
    rollupOptions: {
      external: isBareImport,
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        dir: "lib",
      },
    },
  },
});
