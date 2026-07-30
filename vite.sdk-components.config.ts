import { defineConfig } from "vite";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const hasPrivateFolders = existsSync(
  path.join(process.cwd(), "private-src", "README.md")
);

type ExportConditions = {
  webstudio?: string;
  "webstudio-private"?: string;
};

const packageJson = JSON.parse(
  readFileSync(path.join(process.cwd(), "package.json"), "utf8")
) as { exports: Record<string, ExportConditions> };

const entries = Object.values(packageJson.exports).map((conditions) => {
  const entry = conditions.webstudio;
  if (entry === undefined) {
    throw new Error('Package export is missing the "webstudio" condition');
  }
  if (hasPrivateFolders && conditions["webstudio-private"] !== undefined) {
    return conditions["webstudio-private"];
  }
  if (hasPrivateFolders && entry === "./src/components.ts") {
    return "./private-src/components.ts";
  }
  return entry;
});

const isBareImport = (id: string) =>
  id.startsWith("\0") === false &&
  id.startsWith(".") === false &&
  path.isAbsolute(id) === false;

export default defineConfig({
  build: {
    lib: {
      entry: entries,
    },
    rollupOptions: {
      external: isBareImport,
      output: [
        {
          preserveModules: true,
          preserveModulesRoot: "src",
          format: "es",
          dir: "lib",
        },
        hasPrivateFolders
          ? {
              preserveModules: true,
              preserveModulesRoot: "private-src",
              format: "es",
              dir: "lib",
            }
          : undefined,
      ].filter((output) => output !== undefined),
    },
  },
});
