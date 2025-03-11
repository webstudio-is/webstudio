import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from "@remix-run/dev";
import { defineConfig } from "vite";

import { existsSync } from "node:fs";
// @ts-ignore
import path from "node:path";
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

export default defineConfig(({ mode }) => ({
  resolve: {
    conditions,
  },
  ssr: {
    resolve: {
      conditions,
    },
  },
  plugins: [
    // without this, remixCloudflareDevProxy trying to load workerd even for production (it's not needed for production)
    mode === "production" ? undefined : remixCloudflareDevProxy(),
    remix({
      future: {
        v3_lazyRouteDiscovery: false,
        v3_relativeSplatPath: false,
        v3_singleFetch: false,
        v3_fetcherPersist: false,
        v3_throwAbortReason: false,
      },
    }),
  ].filter(Boolean),
}));
