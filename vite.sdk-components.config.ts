import { defineConfig } from "vite";
import { existsSync } from "node:fs";
import path from "node:path";

const hasPrivateFolders = existsSync(
  path.join(process.cwd(), "private-src", "README.md")
);
const maybeEntry = (entry: string) => {
  return existsSync(path.join(process.cwd(), entry)) ? entry : undefined;
};

const isBareImport = (id: string) =>
  id.startsWith("@") || id.includes(".") === false;

export default defineConfig({
  build: {
    lib: {
      entry: [
        maybeEntry("src/index.ts"),
        hasPrivateFolders ? "private-src/components.ts" : "src/components.ts",
        "src/metas.ts",
        "src/hooks.ts",
        "src/templates.ts",
      ].filter((entry) => entry !== undefined),
      formats: ["es"],
    },
    rollupOptions: {
      external: isBareImport,
      output: [
        {
          preserveModules: true,
          preserveModulesRoot: "src",
          dir: "lib",
        },
        hasPrivateFolders
          ? {
              preserveModules: true,
              preserveModulesRoot: "private-src",
              dir: "lib",
            }
          : undefined,
      ].filter((output) => output !== undefined),
    },
  },
});
