/** Matches Builder component resolution when private implementations exist. */
import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = ["..", "../..", "../../.."]
  .map((directory) => path.join(import.meta.dirname, directory))
  .find((directory) => existsSync(path.join(directory, ".git")));

const hasPrivateComponents = existsSync(
  path.join(
    rootDir ?? "",
    "packages/sdk-components-animation/private-src/components.ts"
  )
);

const conditions = hasPrivateComponents
  ? ["webstudio-private", "webstudio"]
  : ["webstudio"];

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
});
