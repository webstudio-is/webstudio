import { defineConfig } from "vite";
// @ts-ignore
import { reactRouter } from "@react-router/dev/vite";
// @ts-ignore
import { dedupeMeta } from "./proxy-emulator/dedupe-meta";
import { existsSync, readdirSync } from "fs";
// @ts-ignore
import path from "path";

const isFolderEmpty = (folderPath: string) => {
  if (!existsSync(folderPath)) {
    return true; // Folder does not exist
  }
  const contents = readdirSync(folderPath);

  return contents.length === 0;
};

const hasPrivateFolders = !isFolderEmpty(
  path.join(__dirname, "../../packages/sdk-components-animation/private-src")
);

const conditions = hasPrivateFolders
  ? ["webstudio-private", "webstudio"]
  : ["webstudio"];

export default defineConfig({
  resolve: {
    conditions,
  },
  ssr: {
    resolve: {
      conditions,
    },
  },
  plugins: [reactRouter(), dedupeMeta],
});
