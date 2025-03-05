import { defineConfig } from "vite";
// @ts-ignore
import { reactRouter } from "@react-router/dev/vite";
// @ts-ignore
import { dedupeMeta } from "./proxy-emulator/dedupe-meta";
import { existsSync } from "fs";
// @ts-ignore
import path from "path";
// @ts-ignore
import fg from "fast-glob";

const rootDir = ["..", "../..", "../../.."]
  .map((dir) => path.join(__dirname, dir))
  .find((dir) => existsSync(path.join(dir, ".git")));

const hasPrivateFolders =
  fg.sync([path.join(rootDir ?? "", "packages/*/private-src/*")], {
    ignore: ["**/node_modules/**"],
  }).length > 0;

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
