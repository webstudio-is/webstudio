import { defineConfig } from "vite";
import * as path from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { defaultClientConditions } from "vite";

const isFolderEmpty = (folderPath: string) => {
  if (!existsSync(folderPath)) {
    return true;
  }
  const contents = readdirSync(folderPath);
  return contents.length === 0;
};

const hasPrivateFolders = !isFolderEmpty(
  path.resolve("./packages/sdk-components-animation/private-src")
);

export default defineConfig({
  optimizeDeps: {
    exclude: ["scroll-timeline-polyfill"],
  },
  define: {
    "process.env.NODE_DEBUG": JSON.stringify(undefined),
  },
  resolve: {
    conditions: hasPrivateFolders
      ? ["webstudio-private", "webstudio", ...defaultClientConditions]
      : ["webstudio", ...defaultClientConditions],
    alias: [
      {
        find: "~",
        replacement: path.resolve("./apps/builder/app"),
      },
    ],
  },
});
