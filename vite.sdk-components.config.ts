import { defineConfig } from "vite";
import { existsSync } from "node:fs";
import path from "node:path";

const hasPrivateFolders = existsSync(
  path.join(process.cwd(), "private-src", "README.md")
);

const isBareImport = (id: string) =>
  id.startsWith("@") || id.includes(".") === false;

export default defineConfig({
  build: {
    lib: {
      entry: [
        hasPrivateFolders ? "private-src/components.ts" : "src/components.ts",
        "src/metas.ts",
        "src/props.ts",
        "src/hooks.ts",
        "src/templates.ts",
      ],
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
